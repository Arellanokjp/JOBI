import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';

import { PrismaService } from '../prisma/prisma.service';
import { AccessService } from '../common/access.service';
import { assertDateOrder, toDate } from '../common/dates';
import type { AuthUser } from '../common/auth-user';
import { CreateExperienceDto } from './dto/create-experience.dto';
import { UpdateExperienceDto } from './dto/update-experience.dto';

@Injectable()
export class ExperienceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: AccessService,
  ) {}

  /** Seekers: entries on their resume. Employers: on resumes attached to their applicants. */
  private visibleWhere(user: AuthUser): Prisma.experienceWhereInput {
    switch (user.role) {
      case 'ADMIN':
        return { deleted_at: null, resumes: { deleted_at: null } };
      case 'EMPLOYER':
        return { deleted_at: null, resumes: this.access.resumesVisibleToEmployer(user.id) };
      default:
        return { deleted_at: null, resumes: { user_id: user.id, deleted_at: null } };
    }
  }

  findAll(user: AuthUser) {
    return this.prisma.experience.findMany({
      where: this.visibleWhere(user),
      orderBy: { created_at: 'desc' },
    });
  }

  async findOne(id: string, user: AuthUser) {
    const item = await this.prisma.experience.findFirst({ where: { id, ...this.visibleWhere(user) } });
    if (!item) throw new NotFoundException('Record not found.');
    return item;
  }

  /** The resume to attach to: the one named in the body (must be yours) or your own. */
  private async resolveResumeId(resumeId: string | undefined, user: AuthUser): Promise<string> {
    if (!resumeId) return (await this.access.getOwnResume(user.id)).id;
    const resume = await this.prisma.resumes.findFirst({
      where: { id: resumeId, user_id: user.id, deleted_at: null },
      select: { id: true },
    });
    if (!resume) throw new BadRequestException('resume_id must be your own resume.');
    return resume.id;
  }

  /** Write access: only the resume's owner. */
  private async ownedItem(id: string, user: AuthUser) {
    const item = await this.prisma.experience.findFirst({
      where: { id, deleted_at: null, resumes: { user_id: user.id, deleted_at: null } },
    });
    if (!item) throw new NotFoundException('Record not found.');
    return item;
  }

  /** Soft delete. */
  async remove(id: string, user: AuthUser) {
    await this.ownedItem(id, user);
    return this.prisma.experience.update({ where: { id }, data: { deleted_at: new Date() } });
  }

  /** A current job has no end date. */
  private assertCurrent(isCurrent: boolean | undefined, endDate: unknown) {
    if (isCurrent && endDate) {
      throw new BadRequestException('A current position cannot have an end_date.');
    }
  }

  async create(dto: CreateExperienceDto, user: AuthUser) {
    const resumeId = await this.resolveResumeId(dto.resume_id, user);
    assertDateOrder(dto.start_date, dto.end_date, 'start_date', 'end_date');
    this.assertCurrent(dto.is_current, dto.end_date);

    const { resume_id: _ignored, start_date, end_date, ...fields } = dto;
    void _ignored;
    return this.prisma.experience.create({
      data: {
        ...fields,
        id: randomUUID(),
        resume_id: resumeId,
        start_date: new Date(start_date),
        end_date: toDate(end_date),
      },
    });
  }

  async update(id: string, dto: UpdateExperienceDto, user: AuthUser) {
    const existing = await this.ownedItem(id, user);

    const nextCurrent = dto.is_current ?? existing.is_current;
    // Marking a job as current clears a previously stored end date.
    const nextEnd = dto.end_date !== undefined ? dto.end_date : nextCurrent ? null : existing.end_date;

    assertDateOrder(dto.start_date ?? existing.start_date, nextEnd, 'start_date', 'end_date');
    this.assertCurrent(nextCurrent, dto.end_date);

    const { start_date, end_date, ...fields } = dto;
    void end_date;
    return this.prisma.experience.update({
      where: { id },
      data: {
        ...fields,
        ...(start_date !== undefined ? { start_date: new Date(start_date) } : {}),
        ...(dto.end_date !== undefined
          ? { end_date: new Date(dto.end_date) }
          : dto.is_current
            ? { end_date: null }
            : {}),
      },
    });
  }
}
