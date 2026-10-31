import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';

import { PrismaService } from '../prisma/prisma.service';
import { AccessService } from '../common/access.service';
import type { AuthUser } from '../common/auth-user';
import { JOB_STATUS } from '../common/constants';
import { pageArgs } from '../common/pagination.dto';
import { CreateJobDto } from './dto/create-jobs.dto';
import { ListJobsQueryDto, UpdateJobDto } from './dto/update-jobs.dto';

/** A job that job seekers can see and apply to right now. */
export function openJobWhere(now = new Date()): Prisma.jobsWhereInput {
  return {
    status: JOB_STATUS.PUBLISHED,
    deleted_at: null,
    companies: { deleted_at: null },
    OR: [{ application_deadline: null }, { application_deadline: { gt: now } }],
  };
}

const jobInclude = {
  companies: {
    select: {
      id: true,
      company_name: true,
      logo_url: true,
      city: true,
      county: true,
      country: true,
      verification_status: true,
    },
  },
  job_categories: { select: { id: true, name: true } },
  job_types: { select: { id: true, name: true } },
  application_forms: { select: { id: true, is_active: true } },
} satisfies Prisma.jobsInclude;

@Injectable()
export class JobsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: AccessService,
  ) {}

  /** Job seekers: open jobs. Employers: their company's jobs. Admins: all jobs. */
  private visibleWhere(user: AuthUser): Prisma.jobsWhereInput {
    switch (user.role) {
      case 'ADMIN':
        return { deleted_at: null };
      case 'EMPLOYER':
        return { deleted_at: null, companies: { owner_user_id: user.id } };
      default:
        return openJobWhere();
    }
  }

  findAll(user: AuthUser, query: ListJobsQueryDto = {}) {
    const and: Prisma.jobsWhereInput[] = [this.visibleWhere(user)];

    if (query.q) {
      and.push({
        OR: [
          { title: { contains: query.q } },
          { description: { contains: query.q } },
          { location: { contains: query.q } },
        ],
      });
    }
    if (query.category_id) and.push({ category_id: query.category_id });
    if (query.job_type_id) and.push({ job_type_id: query.job_type_id });
    if (query.company_id) and.push({ company_id: query.company_id });
    if (query.location) and.push({ location: { contains: query.location } });
    if (query.is_remote !== undefined) and.push({ is_remote: query.is_remote });
    if (query.status && user.role !== 'JOB_SEEKER') and.push({ status: query.status });

    return this.prisma.jobs.findMany({
      where: { AND: and },
      include: jobInclude,
      orderBy: [{ published_at: 'desc' }, { created_at: 'desc' }],
      ...pageArgs(query),
    });
  }

  async findOne(id: string, user: AuthUser) {
    const job = await this.prisma.jobs.findFirst({
      where: { id, ...this.visibleWhere(user) },
      include: jobInclude,
    });
    if (!job) throw new NotFoundException('Job not found.');
    return job;
  }

  private assertSalaryRange(min?: unknown, max?: unknown) {
    if (min != null && max != null && Number(min) > Number(max)) {
      throw new BadRequestException('salary_min cannot be greater than salary_max.');
    }
  }

  private parseDeadline(value: string | undefined) {
    if (value === undefined) return undefined;
    const date = new Date(value);
    if (date.getTime() <= Date.now()) {
      throw new BadRequestException('application_deadline must be in the future.');
    }
    return date;
  }

  private async assertLookups(categoryId?: string, jobTypeId?: string) {
    if (categoryId) {
      const category = await this.prisma.job_categories.findFirst({
        where: { id: categoryId, is_active: true },
        select: { id: true },
      });
      if (!category) throw new BadRequestException('category_id does not match an active category.');
    }
    if (jobTypeId) {
      const type = await this.prisma.job_types.findFirst({
        where: { id: jobTypeId, is_active: true },
        select: { id: true },
      });
      if (!type) throw new BadRequestException('job_type_id does not match an active job type.');
    }
  }

  /** Only employers create jobs; the company is always their own. */
  async create(dto: CreateJobDto, user: AuthUser) {
    const publishing = dto.status === JOB_STATUS.PUBLISHED;
    const company = publishing
      ? await this.access.getApprovedCompany(user.id)
      : await this.access.getOwnCompany(user.id);

    this.assertSalaryRange(dto.salary_min, dto.salary_max);
    await this.assertLookups(dto.category_id, dto.job_type_id);

    const { application_deadline, status, ...fields } = dto;

    return this.prisma.jobs.create({
      data: {
        ...fields,
        id: randomUUID(),
        company_id: company.id,
        application_deadline: this.parseDeadline(application_deadline),
        status: status ?? JOB_STATUS.DRAFT,
        published_at: publishing ? new Date() : null,
      },
      include: jobInclude,
    });
  }

  async update(id: string, dto: UpdateJobDto, user: AuthUser) {
    const existing = await this.findOne(id, user);

    this.assertSalaryRange(
      dto.salary_min ?? existing.salary_min,
      dto.salary_max ?? existing.salary_max,
    );
    await this.assertLookups(dto.category_id, dto.job_type_id);

    const { application_deadline, status, ...fields } = dto;

    const becomingPublished =
      status === JOB_STATUS.PUBLISHED && existing.status !== JOB_STATUS.PUBLISHED;
    if (becomingPublished) {
      const company = await this.prisma.companies.findUnique({
        where: { id: existing.company_id },
      });
      if (company?.verification_status !== 'APPROVED') {
        throw new BadRequestException(
          'The company must be approved by an administrator before jobs can be published.',
        );
      }
    }

    return this.prisma.jobs.update({
      where: { id },
      data: {
        ...fields,
        ...(application_deadline !== undefined
          ? { application_deadline: this.parseDeadline(application_deadline) }
          : {}),
        ...(status !== undefined ? { status } : {}),
        ...(becomingPublished && !existing.published_at ? { published_at: new Date() } : {}),
      },
      include: jobInclude,
    });
  }

  /** Soft delete. */
  async remove(id: string, user: AuthUser) {
    await this.findOne(id, user);
    return this.prisma.jobs.update({
      where: { id },
      data: { deleted_at: new Date() },
    });
  }
}
