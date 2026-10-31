import { Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import type { AuthUser } from '../common/auth-user';
import { CreateJobTypeDto } from './dto/create-job-types.dto';
import { UpdateJobTypeDto } from './dto/update-job-types.dto';
import { randomUUID } from 'crypto';

@Injectable()
export class JobTypesService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(user: AuthUser) {
    const where: Prisma.job_typesWhereInput = user.role === 'ADMIN' ? {} : { is_active: true };
    return this.prisma.job_types.findMany({ where, orderBy: { name: 'asc' } });
  }

  async findOne(id: string, user: AuthUser) {
    const item = await this.prisma.job_types.findFirst({
      where: { id, ...(user.role === 'ADMIN' ? {} : { is_active: true }) },
    });
    if (!item) throw new NotFoundException('Record not found.');
    return item;
  }

  create(dto: CreateJobTypeDto) {
    return this.prisma.job_types.create({
      data: { ...dto, name: dto.name.trim(), id: randomUUID() },
    });
  }

  async update(id: string, dto: UpdateJobTypeDto) {
    const data = { ...dto, ...(dto.name !== undefined ? { name: dto.name.trim() } : {}) };
    return this.prisma.job_types.update({ where: { id }, data });
  }

  /** Hard delete; fails with 409 if jobs/resumes still reference the record. */
  async remove(id: string) {
    return this.prisma.job_types.delete({ where: { id } });
  }
}
