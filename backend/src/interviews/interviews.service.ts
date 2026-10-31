import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';

import { PrismaService } from '../prisma/prisma.service';
import { createNotification, NOTIFICATION_TYPE } from '../notifications/notify';
import type { AuthUser } from '../common/auth-user';
import {
  APPLICATION_STATUS, INTERVIEW_STATUS, INTERVIEW_TYPE, TERMINAL_APPLICATION_STATUSES,
} from '../common/constants';
import { CreateInterviewDto } from './dto/create-interviews.dto';
import { UpdateInterviewDto } from './dto/update-interviews.dto';

const include = {
  applications: {
    select: {
      id: true,
      status: true,
      job_id: true,
      jobs: { select: { id: true, title: true } },
      users: { select: { id: true, first_name: true, last_name: true, email: true } },
    },
  },
} satisfies Prisma.interviewsInclude;

/** Statuses from which scheduling an interview moves the application forward. */
const PRE_INTERVIEW: string[] = [
  APPLICATION_STATUS.SUBMITTED,
  APPLICATION_STATUS.UNDER_REVIEW,
  APPLICATION_STATUS.SHORTLISTED,
];

@Injectable()
export class InterviewsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Candidates: interviews for their applications. Employers: for their company's jobs. */
  private visibleWhere(user: AuthUser): Prisma.interviewsWhereInput {
    switch (user.role) {
      case 'ADMIN':
        return { deleted_at: null };
      case 'EMPLOYER':
        return {
          deleted_at: null,
          applications: { jobs: { companies: { owner_user_id: user.id } } },
        };
      default:
        return { deleted_at: null, applications: { applicant_user_id: user.id } };
    }
  }

  /** Internal notes are for the hiring side only. */
  private scrub<T extends { notes?: string | null }>(item: T, user: AuthUser): T {
    return user.role === 'JOB_SEEKER' ? { ...item, notes: null } : item;
  }

  async findAll(user: AuthUser, applicationId?: string) {
    const items = await this.prisma.interviews.findMany({
      where: { ...this.visibleWhere(user), ...(applicationId ? { application_id: applicationId } : {}) },
      include,
      orderBy: { scheduled_at: 'asc' },
    });
    return items.map((item) => this.scrub(item, user));
  }

  async findOne(id: string, user: AuthUser) {
    const item = await this.prisma.interviews.findFirst({
      where: { id, ...this.visibleWhere(user) },
      include,
    });
    if (!item) throw new NotFoundException('Interview not found.');
    return this.scrub(item, user);
  }

  /** VIDEO interviews need a link; IN_PERSON interviews need a place. */
  private assertLogistics(type: string, meetingUrl?: string | null, location?: string | null) {
    if (type === INTERVIEW_TYPE.VIDEO && !meetingUrl) {
      throw new BadRequestException('meeting_url is required for VIDEO interviews.');
    }
    if (type === INTERVIEW_TYPE.IN_PERSON && !location) {
      throw new BadRequestException('location is required for IN_PERSON interviews.');
    }
  }

  private assertFuture(value: string) {
    if (new Date(value).getTime() <= Date.now()) {
      throw new BadRequestException('scheduled_at must be in the future.');
    }
  }

  async create(dto: CreateInterviewDto, user: AuthUser) {
    const app = await this.prisma.applications.findFirst({
      where: {
        id: dto.application_id,
        ...(user.role === 'ADMIN' ? {} : { jobs: { companies: { owner_user_id: user.id } } }),
      },
      include: { jobs: { select: { title: true } } },
    });
    if (!app) throw new NotFoundException('Application not found.');

    if (TERMINAL_APPLICATION_STATUSES.includes(app.status)) {
      throw new ConflictException(`Cannot schedule an interview for an application that is ${app.status}.`);
    }

    this.assertLogistics(dto.interview_type, dto.meeting_url, dto.location);
    this.assertFuture(dto.scheduled_at);

    const id = randomUUID();
    await this.prisma.$transaction(async (tx) => {
      await tx.interviews.create({
        data: {
          ...dto,
          id,
          scheduled_at: new Date(dto.scheduled_at),
          scheduled_by_user_id: user.id,
          status: INTERVIEW_STATUS.SCHEDULED,
        },
      });

      if (PRE_INTERVIEW.includes(app.status)) {
        await tx.applications.update({
          where: { id: app.id },
          data: { status: APPLICATION_STATUS.INTERVIEW_SCHEDULED },
        });
      }

      await createNotification(tx, {
        user_id: app.applicant_user_id,
        title: 'Interview scheduled',
        message: `An interview for "${app.jobs.title}" has been scheduled for ${new Date(dto.scheduled_at).toUTCString()}.`,
        notification_type: NOTIFICATION_TYPE.INTERVIEW,
      });
    });

    return this.findOne(id, user);
  }

  async update(id: string, dto: UpdateInterviewDto, user: AuthUser) {
    const interview = await this.prisma.interviews.findFirst({
      where: { id, ...this.visibleWhere(user) },
      include: { applications: { select: { applicant_user_id: true, jobs: { select: { title: true } } } } },
    });
    if (!interview) throw new NotFoundException('Interview not found.');

    this.assertLogistics(
      dto.interview_type ?? interview.interview_type,
      dto.meeting_url !== undefined ? dto.meeting_url : interview.meeting_url,
      dto.location !== undefined ? dto.location : interview.location,
    );
    if (dto.scheduled_at) this.assertFuture(dto.scheduled_at);

    const { scheduled_at, ...rest } = dto;
    const rescheduled =
      scheduled_at !== undefined &&
      new Date(scheduled_at).getTime() !== interview.scheduled_at.getTime();

    await this.prisma.$transaction(async (tx) => {
      await tx.interviews.update({
        where: { id },
        data: { ...rest, ...(scheduled_at !== undefined ? { scheduled_at: new Date(scheduled_at) } : {}) },
      });

      if (rescheduled) {
        await createNotification(tx, {
          user_id: interview.applications.applicant_user_id,
          title: 'Interview rescheduled',
          message: `Your interview for "${interview.applications.jobs.title}" is now ${new Date(scheduled_at!).toUTCString()}.`,
          notification_type: NOTIFICATION_TYPE.INTERVIEW,
        });
      }
    });

    return this.findOne(id, user);
  }

  /** Soft delete; the candidate is told it was cancelled. */
  async remove(id: string, user: AuthUser) {
    const interview = await this.prisma.interviews.findFirst({
      where: { id, ...this.visibleWhere(user) },
      include: { applications: { select: { applicant_user_id: true, jobs: { select: { title: true } } } } },
    });
    if (!interview) throw new NotFoundException('Interview not found.');

    await this.prisma.$transaction(async (tx) => {
      await tx.interviews.update({
        where: { id },
        data: { deleted_at: new Date(), status: INTERVIEW_STATUS.CANCELLED },
      });
      await createNotification(tx, {
        user_id: interview.applications.applicant_user_id,
        title: 'Interview cancelled',
        message: `Your interview for "${interview.applications.jobs.title}" was cancelled.`,
        notification_type: NOTIFICATION_TYPE.INTERVIEW,
      });
    });

    return { message: 'Interview cancelled.' };
  }
}
