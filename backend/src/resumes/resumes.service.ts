import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';

import { PrismaService } from '../prisma/prisma.service';
import { AccessService } from '../common/access.service';
import type { AuthUser } from '../common/auth-user';
import { CreateResumeDto } from './dto/create-resumes.dto';
import { UpdateResumeDto } from './dto/update-resumes.dto';

const resumeInclude = {
  education: { where: { deleted_at: null }, orderBy: { start_date: 'desc' } },
  experience: { where: { deleted_at: null }, orderBy: { start_date: 'desc' } },
  certifications: { where: { deleted_at: null }, orderBy: { issue_date: 'desc' } },
  resume_skills: { include: { skills: true } },
} satisfies Prisma.resumesInclude;

@Injectable()
export class ResumesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: AccessService,
  ) {}

  /** Seekers: their own. Employers: resumes attached to applications for their jobs. */
  private visibleWhere(user: AuthUser): Prisma.resumesWhereInput {
    switch (user.role) {
      case 'ADMIN':
        return { deleted_at: null };
      case 'EMPLOYER':
        return this.access.resumesVisibleToEmployer(user.id);
      default:
        return { deleted_at: null, user_id: user.id };
    }
  }

  findAll(user: AuthUser) {
    return this.prisma.resumes.findMany({
      where: this.visibleWhere(user),
      include: resumeInclude,
      orderBy: { updated_at: 'desc' },
    });
  }

  async findOne(id: string, user: AuthUser) {
    const resume = await this.prisma.resumes.findFirst({
      where: { id, ...this.visibleWhere(user) },
      include: resumeInclude,
    });
    if (!resume) throw new NotFoundException('Resume not found.');
    return resume;
  }

  /** One resume per user (user_id is unique). A deleted resume is restored. */
  async create(dto: CreateResumeDto, user: AuthUser) {
    const existing = await this.prisma.resumes.findUnique({ where: { user_id: user.id } });

    if (existing && !existing.deleted_at) {
      throw new ConflictException('You already have a resume; update it instead.');
    }

    if (existing) {
      return this.prisma.resumes.update({
        where: { id: existing.id },
        data: {
          professional_summary: dto.professional_summary ?? null,
          resume_file_url: dto.resume_file_url ?? null,
          deleted_at: null,
        },
        include: resumeInclude,
      });
    }

    return this.prisma.resumes.create({
      data: { ...dto, id: randomUUID(), user_id: user.id },
      include: resumeInclude,
    });
  }

  async update(id: string, dto: UpdateResumeDto, user: AuthUser) {
    await this.ownedResume(id, user);
    return this.prisma.resumes.update({ where: { id }, data: dto, include: resumeInclude });
  }

  /** Soft delete the resume and its entries; skills (no deleted_at) are removed. */
  async remove(id: string, user: AuthUser) {
    await this.ownedResume(id, user);
    const now = new Date();
    await this.prisma.$transaction([
      this.prisma.education.updateMany({ where: { resume_id: id, deleted_at: null }, data: { deleted_at: now } }),
      this.prisma.experience.updateMany({ where: { resume_id: id, deleted_at: null }, data: { deleted_at: now } }),
      this.prisma.certifications.updateMany({ where: { resume_id: id, deleted_at: null }, data: { deleted_at: now } }),
      this.prisma.resume_skills.deleteMany({ where: { resume_id: id } }),
      this.prisma.resumes.update({ where: { id }, data: { deleted_at: now } }),
    ]);
    return { message: 'Resume deleted.' };
  }

  /** Write access: only the owner (job seeker) may modify a resume. */
  private async ownedResume(id: string, user: AuthUser) {
    const resume = await this.prisma.resumes.findFirst({
      where: { id, user_id: user.id, deleted_at: null },
    });
    if (!resume) throw new NotFoundException('Resume not found.');
    return resume;
  }
}
