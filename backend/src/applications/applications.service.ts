import {
  BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException,
} from '@nestjs/common';
import type { application_fields, Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';

import { PrismaService } from '../prisma/prisma.service';
import { openJobWhere } from '../jobs/jobs.service';
import { createNotification, NOTIFICATION_TYPE } from '../notifications/notify';
import { hasValue, toResponseColumns } from '../application-responses/response-value.util';
import type { AuthUser } from '../common/auth-user';
import {
  APPLICATION_STATUS, INTERVIEW_STATUS, TERMINAL_APPLICATION_STATUSES,
} from '../common/constants';
import { pageArgs } from '../common/pagination.dto';
import { ApplicationResponseInputDto, CreateApplicationDto } from './dto/create-applications.dto';
import { ListApplicationsQueryDto, UpdateApplicationDto } from './dto/update-applications.dto';

const jobSummary = {
  select: {
    id: true,
    title: true,
    status: true,
    company_id: true,
    companies: { select: { id: true, company_name: true, logo_url: true } },
  },
} as const;

const applicantSummary = {
  select: {
    id: true,
    first_name: true,
    last_name: true,
    email: true,
    phone_number: true,
    profile_photo_url: true,
  },
} as const;

@Injectable()
export class ApplicationsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Seekers: their own. Employers: applications to their company's jobs. Admins: all. */
  private visibleWhere(user: AuthUser): Prisma.applicationsWhereInput {
    switch (user.role) {
      case 'ADMIN':
        return {};
      case 'EMPLOYER':
        return { jobs: { companies: { owner_user_id: user.id } } };
      default:
        return { applicant_user_id: user.id };
    }
  }

  /** Employers and admins also see who applied; seekers do not need their own profile echoed. */
  private includeFor(user: AuthUser, detailed: boolean) {
    return {
      jobs: jobSummary,
      ...(user.role === 'JOB_SEEKER' ? {} : { users: applicantSummary }),
      ...(detailed
        ? {
            resumes: true,
            application_responses: { include: { application_fields: true } },
            interviews: { where: { deleted_at: null }, orderBy: { scheduled_at: 'asc' } },
          }
        : {}),
    } satisfies Prisma.applicationsInclude;
  }

  /** Interview notes are internal to the employer. */
  private scrub<T extends { interviews?: Array<Record<string, unknown>> }>(app: T, user: AuthUser): T {
    if (user.role === 'JOB_SEEKER' && app.interviews) {
      return {
        ...app,
        interviews: app.interviews.map(({ notes: _notes, ...rest }) => rest),
      };
    }
    return app;
  }

  async findAll(user: AuthUser, query: ListApplicationsQueryDto = {}) {
    return this.prisma.applications.findMany({
      where: {
        ...this.visibleWhere(user),
        ...(query.job_id ? { job_id: query.job_id } : {}),
        ...(query.status ? { status: query.status } : {}),
      },
      include: this.includeFor(user, false),
      orderBy: { applied_at: 'desc' },
      ...pageArgs(query),
    });
  }

  async findOne(id: string, user: AuthUser) {
    const app = await this.prisma.applications.findFirst({
      where: { id, ...this.visibleWhere(user) },
      include: this.includeFor(user, true),
    });
    if (!app) throw new NotFoundException('Application not found.');
    return this.scrub(app as typeof app & { interviews: Array<Record<string, unknown>> }, user);
  }

  /**
   * Check the submitted answers against the job's form and turn them into rows.
   * Every required field must be answered; unknown fields are rejected.
   */
  private buildResponses(
    fields: application_fields[],
    answers: ApplicationResponseInputDto[],
  ) {
    if (fields.length === 0) {
      if (answers.length > 0) {
        throw new BadRequestException('This job has no application form to answer.');
      }
      return [];
    }

    const byId = new Map(fields.map((field) => [field.id, field]));
    const seen = new Set<string>();
    for (const answer of answers) {
      if (!byId.has(answer.application_field_id)) {
        throw new BadRequestException(
          `application_field_id ${answer.application_field_id} does not belong to this job's form.`,
        );
      }
      if (seen.has(answer.application_field_id)) {
        throw new BadRequestException('Each field can only be answered once.');
      }
      seen.add(answer.application_field_id);
    }

    const rows: Array<{ application_field_id: string } & ReturnType<typeof toResponseColumns>> = [];
    for (const field of fields) {
      const answer = answers.find((a) => a.application_field_id === field.id);
      if (!answer || !hasValue(field, answer)) {
        if (field.is_required) {
          throw new BadRequestException(`An answer is required for "${field.field_label}".`);
        }
        continue;
      }
      rows.push({ application_field_id: field.id, ...toResponseColumns(field, answer) });
    }
    return rows;
  }

  async create(dto: CreateApplicationDto, user: AuthUser) {
    const job = await this.prisma.jobs.findFirst({
      where: { id: dto.job_id, ...openJobWhere() },
      include: {
        companies: { select: { owner_user_id: true } },
        application_forms: { include: { application_fields: true } },
      },
    });
    if (!job) {
      throw new NotFoundException('Job not found or no longer accepting applications.');
    }

    if (dto.resume_id) {
      const resume = await this.prisma.resumes.findFirst({
        where: { id: dto.resume_id, user_id: user.id, deleted_at: null },
        select: { id: true },
      });
      if (!resume) throw new BadRequestException('resume_id must be one of your own resumes.');
    }

    const form = job.application_forms?.is_active ? job.application_forms : null;
    const rows = this.buildResponses(form?.application_fields ?? [], dto.responses ?? []);

    const existing = await this.prisma.applications.findUnique({
      where: {
        job_id_applicant_user_id: { job_id: dto.job_id, applicant_user_id: user.id },
      },
    });
    if (existing && existing.status !== APPLICATION_STATUS.WITHDRAWN) {
      throw new ConflictException('You have already applied for this job.');
    }

    const applicationId = await this.prisma.$transaction(async (tx) => {
      let id: string;
      if (existing) {
        // Re-applying after a withdrawal reuses the row (job + applicant is unique).
        id = existing.id;
        await tx.application_responses.deleteMany({ where: { application_id: id } });
        await tx.applications.update({
          where: { id },
          data: {
            status: APPLICATION_STATUS.SUBMITTED,
            applied_at: new Date(),
            withdrawn_at: null,
            resume_id: dto.resume_id ?? null,
          },
        });
      } else {
        id = randomUUID();
        await tx.applications.create({
          data: {
            id,
            job_id: dto.job_id,
            applicant_user_id: user.id,
            resume_id: dto.resume_id ?? null,
            status: APPLICATION_STATUS.SUBMITTED,
          },
        });
      }

      if (rows.length > 0) {
        await tx.application_responses.createMany({
          data: rows.map((row) => ({ ...row, id: randomUUID(), application_id: id })),
        });
      }

      await createNotification(tx, {
        user_id: job.companies.owner_user_id,
        title: 'New application received',
        message: `${user.first_name} ${user.last_name} applied for "${job.title}".`,
        notification_type: NOTIFICATION_TYPE.APPLICATION_RECEIVED,
      });

      return id;
    });

    return this.findOne(applicationId, user);
  }

  async update(id: string, dto: UpdateApplicationDto, user: AuthUser) {
    const app = await this.prisma.applications.findFirst({
      where: { id, ...this.visibleWhere(user) },
      include: { jobs: { select: { title: true } } },
    });
    if (!app) throw new NotFoundException('Application not found.');

    if (user.role === 'JOB_SEEKER') {
      if (dto.status !== undefined) {
        throw new ForbiddenException('You cannot change the status; withdraw the application instead.');
      }
      if (app.status !== APPLICATION_STATUS.SUBMITTED) {
        throw new ConflictException('The resume can only be changed while the application is SUBMITTED.');
      }
      if (dto.resume_id) {
        const resume = await this.prisma.resumes.findFirst({
          where: { id: dto.resume_id, user_id: user.id, deleted_at: null },
          select: { id: true },
        });
        if (!resume) throw new BadRequestException('resume_id must be one of your own resumes.');
      }
      await this.prisma.applications.update({
        where: { id },
        data: { resume_id: dto.resume_id },
      });
      return this.findOne(id, user);
    }

    // Employer / admin: status changes only.
    if (dto.resume_id !== undefined) {
      throw new BadRequestException('Only the applicant can change the resume.');
    }
    if (!dto.status) {
      throw new BadRequestException('status is required.');
    }
    if (TERMINAL_APPLICATION_STATUSES.includes(app.status)) {
      throw new ConflictException(`An application that is ${app.status} can no longer change.`);
    }

    if (dto.status !== app.status) {
      await this.prisma.$transaction(async (tx) => {
        await tx.applications.update({ where: { id }, data: { status: dto.status } });
        await createNotification(tx, {
          user_id: app.applicant_user_id,
          title: 'Application update',
          message: `Your application for "${app.jobs.title}" is now ${dto.status!.replace(/_/g, ' ').toLowerCase()}.`,
          notification_type: NOTIFICATION_TYPE.APPLICATION_STATUS,
        });
      });
    }
    return this.findOne(id, user);
  }

  /** For job seekers, DELETE withdraws the application; the record is kept. */
  async withdraw(id: string, user: AuthUser) {
    const app = await this.prisma.applications.findFirst({
      where: { id, applicant_user_id: user.id },
      include: { jobs: { select: { title: true, companies: { select: { owner_user_id: true } } } } },
    });
    if (!app) throw new NotFoundException('Application not found.');

    if (TERMINAL_APPLICATION_STATUSES.includes(app.status)) {
      throw new ConflictException(`An application that is ${app.status} cannot be withdrawn.`);
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.applications.update({
        where: { id },
        data: { status: APPLICATION_STATUS.WITHDRAWN, withdrawn_at: new Date() },
      });
      // A withdrawn candidate no longer attends their scheduled interviews.
      await tx.interviews.updateMany({
        where: { application_id: id, deleted_at: null, status: INTERVIEW_STATUS.SCHEDULED },
        data: { status: INTERVIEW_STATUS.CANCELLED },
      });
      await createNotification(tx, {
        user_id: app.jobs.companies.owner_user_id,
        title: 'Application withdrawn',
        message: `${user.first_name} ${user.last_name} withdrew their application for "${app.jobs.title}".`,
        notification_type: NOTIFICATION_TYPE.APPLICATION_STATUS,
      });
    });

    return this.findOne(id, user);
  }
}
