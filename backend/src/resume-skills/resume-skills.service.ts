import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';

import { PrismaService } from '../prisma/prisma.service';
import { AccessService } from '../common/access.service';
import type { AuthUser } from '../common/auth-user';
import { CreateResumeSkillDto } from './dto/create-resume-skills.dto';
import { UpdateResumeSkillDto } from './dto/update-resume-skills.dto';

@Injectable()
export class ResumeSkillsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: AccessService,
  ) {}

  private visibleWhere(user: AuthUser): Prisma.resume_skillsWhereInput {
    switch (user.role) {
      case 'ADMIN':
        return { resumes: { deleted_at: null } };
      case 'EMPLOYER':
        return { resumes: this.access.resumesVisibleToEmployer(user.id) };
      default:
        return { resumes: { user_id: user.id, deleted_at: null } };
    }
  }

  findAll(user: AuthUser) {
    return this.prisma.resume_skills.findMany({
      where: this.visibleWhere(user),
      include: { skills: true },
      orderBy: { created_at: 'desc' },
    });
  }

  async findOne(id: string, user: AuthUser) {
    const item = await this.prisma.resume_skills.findFirst({
      where: { id, ...this.visibleWhere(user) },
      include: { skills: true },
    });
    if (!item) throw new NotFoundException('Resume skill not found.');
    return item;
  }

  async create(dto: CreateResumeSkillDto, user: AuthUser) {
    let resumeId: string;
    if (dto.resume_id) {
      const resume = await this.prisma.resumes.findFirst({
        where: { id: dto.resume_id, user_id: user.id, deleted_at: null },
        select: { id: true },
      });
      if (!resume) throw new BadRequestException('resume_id must be your own resume.');
      resumeId = resume.id;
    } else {
      resumeId = (await this.access.getOwnResume(user.id)).id;
    }

    const skill = await this.prisma.skills.findUnique({ where: { id: dto.skill_id }, select: { id: true } });
    if (!skill) throw new BadRequestException('skill_id does not match a skill.');

    const existing = await this.prisma.resume_skills.findUnique({
      where: { resume_id_skill_id: { resume_id: resumeId, skill_id: dto.skill_id } },
      select: { id: true },
    });
    if (existing) throw new ConflictException('This skill is already on your resume.');

    const { resume_id: _ignored, ...fields } = dto;
    void _ignored;
    return this.prisma.resume_skills.create({
      data: { ...fields, id: randomUUID(), resume_id: resumeId },
      include: { skills: true },
    });
  }

  async update(id: string, dto: UpdateResumeSkillDto, user: AuthUser) {
    await this.ownedItem(id, user);
    return this.prisma.resume_skills.update({ where: { id }, data: dto, include: { skills: true } });
  }

  /** Hard delete (the table has no deleted_at). */
  async remove(id: string, user: AuthUser) {
    await this.ownedItem(id, user);
    return this.prisma.resume_skills.delete({ where: { id } });
  }

  private async ownedItem(id: string, user: AuthUser) {
    const item = await this.prisma.resume_skills.findFirst({
      where: { id, resumes: { user_id: user.id, deleted_at: null } },
    });
    if (!item) throw new NotFoundException('Resume skill not found.');
    return item;
  }
}
