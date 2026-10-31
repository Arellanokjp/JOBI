import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';

import { PrismaService } from '../prisma/prisma.service';
import { openJobWhere } from '../jobs/jobs.service';
import type { AuthUser } from '../common/auth-user';
import { CreateApplicationFormDto } from './dto/create-application-forms.dto';
import { UpdateApplicationFormDto } from './dto/update-application-forms.dto';

const formInclude = {
  application_fields: { orderBy: { display_order: 'asc' } },
} satisfies Prisma.application_formsInclude;

@Injectable()
export class ApplicationFormsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Admins: all forms. Employers: forms of their own jobs.
   * Job seekers: active forms of jobs they can currently apply to.
   */
  private visibleWhere(user: AuthUser): Prisma.application_formsWhereInput {
    switch (user.role) {
      case 'ADMIN':
        return { jobs: { deleted_at: null } };
      case 'EMPLOYER':
        return { jobs: { deleted_at: null, companies: { owner_user_id: user.id } } };
      default:
        return { is_active: true, jobs: openJobWhere() };
    }
  }

  findAll(user: AuthUser) {
    return this.prisma.application_forms.findMany({
      where: this.visibleWhere(user),
      include: formInclude,
      orderBy: { created_at: 'desc' },
    });
  }

  async findOne(id: string, user: AuthUser) {
    const form = await this.prisma.application_forms.findFirst({
      where: { id, ...this.visibleWhere(user) },
      include: formInclude,
    });
    if (!form) throw new NotFoundException('Application form not found.');
    return form;
  }

  /** Convenient lookup for the apply screen: the form of a given job. */
  async findByJob(jobId: string, user: AuthUser) {
    const form = await this.prisma.application_forms.findFirst({
      where: { job_id: jobId, ...this.visibleWhere(user) },
      include: formInclude,
    });
    if (!form) throw new NotFoundException('This job has no application form.');
    return form;
  }

  async create(dto: CreateApplicationFormDto, user: AuthUser) {
    const job = await this.prisma.jobs.findFirst({
      where: {
        id: dto.job_id,
        deleted_at: null,
        ...(user.role === 'ADMIN' ? {} : { companies: { owner_user_id: user.id } }),
      },
      select: { id: true },
    });
    if (!job) throw new NotFoundException('Job not found.');

    // job_id is unique: a job has at most one form.
    const existing = await this.prisma.application_forms.findUnique({
      where: { job_id: dto.job_id },
      select: { id: true },
    });
    if (existing) throw new ConflictException('This job already has an application form.');

    return this.prisma.application_forms.create({
      data: { ...dto, id: randomUUID() },
      include: formInclude,
    });
  }

  async update(id: string, dto: UpdateApplicationFormDto, user: AuthUser) {
    await this.findOne(id, user);
    return this.prisma.application_forms.update({
      where: { id },
      data: dto,
      include: formInclude,
    });
  }

  /**
   * Hard delete (the table has no deleted_at). A form that already collected
   * answers cannot be deleted; deactivate it instead.
   */
  async remove(id: string, user: AuthUser) {
    await this.findOne(id, user);

    const answers = await this.prisma.application_responses.count({
      where: { application_fields: { application_form_id: id } },
    });
    if (answers > 0) {
      throw new ConflictException(
        'This form already has applicant responses. Set is_active to false instead of deleting it.',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.application_fields.deleteMany({ where: { application_form_id: id } });
      return tx.application_forms.delete({ where: { id } });
    });
  }
}
