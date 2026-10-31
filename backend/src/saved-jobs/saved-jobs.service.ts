import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';

import { PrismaService } from '../prisma/prisma.service';
import { openJobWhere } from '../jobs/jobs.service';
import type { AuthUser } from '../common/auth-user';
import { CreateSavedJobDto } from './dto/create-saved-jobs.dto';

@Injectable()
export class SavedJobsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(user: AuthUser) {
    return this.prisma.saved_jobs.findMany({
      // Jobs that were deleted since saving are hidden.
      where: { user_id: user.id, jobs: { deleted_at: null } },
      include: {
        jobs: {
          select: {
            id: true,
            title: true,
            status: true,
            location: true,
            is_remote: true,
            application_deadline: true,
            companies: { select: { id: true, company_name: true, logo_url: true } },
          },
        },
      },
      orderBy: { saved_at: 'desc' },
    });
  }

  async findOne(id: string, user: AuthUser) {
    const saved = await this.prisma.saved_jobs.findFirst({
      where: { id, user_id: user.id },
      include: { jobs: true },
    });
    if (!saved) throw new NotFoundException('Saved job not found.');
    return saved;
  }

  async create(dto: CreateSavedJobDto, user: AuthUser) {
    const job = await this.prisma.jobs.findFirst({
      where: { id: dto.job_id, ...openJobWhere() },
      select: { id: true },
    });
    if (!job) throw new NotFoundException('Job not found.');

    const existing = await this.prisma.saved_jobs.findUnique({
      where: { user_id_job_id: { user_id: user.id, job_id: dto.job_id } },
      select: { id: true },
    });
    if (existing) throw new ConflictException('You have already saved this job.');

    return this.prisma.saved_jobs.create({
      data: { id: randomUUID(), user_id: user.id, job_id: dto.job_id },
    });
  }

  /** Hard delete (the table has no deleted_at). */
  async remove(id: string, user: AuthUser) {
    await this.findOne(id, user);
    return this.prisma.saved_jobs.delete({ where: { id } });
  }
}
