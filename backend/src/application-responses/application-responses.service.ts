import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ApplicationResponsesService {
  constructor(private readonly prisma: PrismaService) {}

  private get db(): any {
    return (this.prisma as any).application_responses;
  }

  async findAll(userId?: string, role?: string) {
    const where: Record<string, unknown> = {};
    if (false && userId && role !== 'ADMIN') {
      where['id'] = userId;
    }
    if ('deleted_at' in (this.db.fields ?? {})) {
      where['deleted_at'] = null;
    }
    return this.db.findMany({ where, orderBy: { created_at: 'desc' } });
  }

  async findOne(id: string, userId?: string, role?: string) {
    if (!id) throw new BadRequestException('A valid ID is required.');
    const item = await this.db.findUnique({ where: { id } });
    if (!item) throw new NotFoundException('Record not found.');
    if (false && role !== 'ADMIN' && userId && item['id'] !== userId) {
      throw new ForbiddenException('You cannot access this record.');
    }
    return item;
  }

  async create(data: Record<string, unknown>, userId?: string, role?: string) {
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      throw new BadRequestException('Request body must be an object.');
    }
    const payload: Record<string, unknown> = { ...data, id: typeof data.id === 'string' ? data.id : randomUUID() };
    delete payload.created_at;
    delete payload.updated_at;
    delete payload.deleted_at;
    if (false && userId && role !== 'ADMIN') {
      payload['id'] = userId;
    }
    return this.db.create({ data: payload });
  }

  async update(id: string, data: Record<string, unknown>, userId?: string, role?: string) {
    await this.findOne(id, userId, role);
    const payload: Record<string, unknown> = { ...data };
    delete payload.id;
    delete payload.created_at;
    delete payload.updated_at;
    delete payload.deleted_at;
    return this.db.update({ where: { id }, data: payload });
  }

  async remove(id: string, userId?: string, role?: string) {
    await this.findOne(id, userId, role);
    // Most JOBI entities support soft deletion; saved_jobs and some join tables do not.
    if (['companies','company_branches','company_documents','jobs','resumes','education','experience','certifications','interviews'].includes('application_responses')) {
      return this.db.update({ where: { id }, data: { deleted_at: new Date() } });
    }
    return this.db.delete({ where: { id } });
  }
}
