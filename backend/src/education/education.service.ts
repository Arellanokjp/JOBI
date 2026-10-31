import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';

import { PrismaService } from '../prisma/prisma.service';
import { AccessService } from '../common/access.service';
import { assertDateOrder, toDate } from '../common/dates';
import type { AuthUser } from '../common/auth-user';
import { CreateEducationDto } from './dto/create-education.dto';
import { UpdateEducationDto } from './dto/update-education.dto';

@Injectable()
export class EducationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: AccessService,
  ) {}

  /** Seekers: entries on their resume. Employers: on resumes attached to their applicants. */
  private visibleWhere(user: AuthUser): Prisma.educationWhereInput {
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
    return this.prisma.education.findMany({
      where: this.visibleWhere(user),
      orderBy: { created_at: 'desc' },
    });
  }

  async findOne(id: string, user: AuthUser) {
    const item = await this.prisma.education.findFirst({ where: { id, ...this.visibleWhere(user) } });
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
    const item = await this.prisma.education.findFirst({
      where: { id, deleted_at: null, resumes: { user_id: user.id, deleted_at: null } },
    });
    if (!item) throw new NotFoundException('Record not found.');
    return item;
  }

  /** Soft delete. */
  async remove(id: string, user: AuthUser) {
    await this.ownedItem(id, user);
    return this.prisma.education.update({ where: { id }, data: { deleted_at: new Date() } });
  }

  async create(dto: CreateEducationDto, user: AuthUser) {
    const resumeId = await this.resolveResumeId(dto.resume_id, user);
    assertDateOrder(dto.start_date, dto.end_date, 'start_date', 'end_date');

    const { resume_id: _ignored, start_date, end_date, ...fields } = dto;
    void _ignored;
    return this.prisma.education.create({
      data: {
        ...fields,
        id: randomUUID(),
        resume_id: resumeId,
        start_date: toDate(start_date),
        end_date: toDate(end_date),
      },
    });
  }

  async update(id: string, dto: UpdateEducationDto, user: AuthUser) {
    const existing = await this.ownedItem(id, user);
    assertDateOrder(
      dto.start_date ?? existing.start_date,
      dto.end_date ?? existing.end_date,
      'start_date',
      'end_date',
    );

    const { start_date, end_date, ...fields } = dto;
    return this.prisma.education.update({
      where: { id },
      data: { ...fields, start_date: toDate(start_date), end_date: toDate(end_date) },
    });
  }
}
