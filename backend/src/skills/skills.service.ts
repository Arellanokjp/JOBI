import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSkillDto } from './dto/create-skills.dto';
import { UpdateSkillDto } from './dto/update-skills.dto';
import { randomUUID } from 'crypto';

@Injectable()
export class SkillsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.skills.findMany({ orderBy: { name: 'asc' } });
  }

  async findOne(id: string) {
    const item = await this.prisma.skills.findFirst({
      where: { id },
    });
    if (!item) throw new NotFoundException('Record not found.');
    return item;
  }

  create(dto: CreateSkillDto) {
    return this.prisma.skills.create({
      data: { ...dto, name: dto.name.trim(), id: randomUUID() },
    });
  }

  async update(id: string, dto: UpdateSkillDto) {
    const data = { ...dto, ...(dto.name !== undefined ? { name: dto.name.trim() } : {}) };
    return this.prisma.skills.update({ where: { id }, data });
  }

  /** Hard delete; fails with 409 if jobs/resumes still reference the record. */
  async remove(id: string) {
    return this.prisma.skills.delete({ where: { id } });
  }
}
