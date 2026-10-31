import { Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import type { AuthUser } from '../common/auth-user';
import { CreateJobCategoryDto } from './dto/create-job-categories.dto';
import { UpdateJobCategoryDto } from './dto/update-job-categories.dto';
import { randomUUID } from 'crypto';

@Injectable()
export class JobCategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(user: AuthUser) {
    const where: Prisma.job_categoriesWhereInput = user.role === 'ADMIN' ? {} : { is_active: true };
    return this.prisma.job_categories.findMany({ where, orderBy: { name: 'asc' } });
  }

  async findOne(id: string, user: AuthUser) {
    const item = await this.prisma.job_categories.findFirst({
      where: { id, ...(user.role === 'ADMIN' ? {} : { is_active: true }) },
    });
    if (!item) throw new NotFoundException('Record not found.');
    return item;
  }

  create(dto: CreateJobCategoryDto) {
    return this.prisma.job_categories.create({
      data: { ...dto, name: dto.name.trim(), id: randomUUID() },
    });
  }

  async update(id: string, dto: UpdateJobCategoryDto) {
    const data = { ...dto, ...(dto.name !== undefined ? { name: dto.name.trim() } : {}) };
    return this.prisma.job_categories.update({ where: { id }, data });
  }

  /** Hard delete; fails with 409 if jobs/resumes still reference the record. */
  async remove(id: string) {
    return this.prisma.job_categories.delete({ where: { id } });
  }
}
