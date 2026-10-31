import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';

import { PrismaService } from '../prisma/prisma.service';
import { pageArgs } from '../common/pagination.dto';
import { CreateAuditLogInput } from './dto/create-audit-logs.dto';
import { ListAuditLogsQueryDto } from './dto/list-audit-logs.dto';

@Injectable()
export class AuditLogsService {
  private readonly logger = new Logger(AuditLogsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Append an audit entry. Best-effort: a failure to write the log is reported
   * but never breaks the business operation that triggered it.
   */
  async record(input: CreateAuditLogInput): Promise<void> {
    try {
      await this.prisma.audit_logs.create({
        data: {
          id: randomUUID(),
          user_id: input.user_id ?? null,
          action: input.action,
          entity_type: input.entity_type,
          entity_id: input.entity_id ?? null,
          description: input.description ?? null,
          ip_address: input.ip_address ?? null,
          user_agent: input.user_agent ?? null,
        },
      });
    } catch (error) {
      this.logger.error(
        `Failed to write audit log "${input.action}": ${(error as Error).message}`,
      );
    }
  }

  findAll(query: ListAuditLogsQueryDto) {
    const where: Prisma.audit_logsWhereInput = {
      ...(query.user_id ? { user_id: query.user_id } : {}),
      ...(query.action ? { action: query.action } : {}),
      ...(query.entity_type ? { entity_type: query.entity_type } : {}),
      ...(query.entity_id ? { entity_id: query.entity_id } : {}),
      ...(query.from || query.to
        ? {
            created_at: {
              ...(query.from ? { gte: query.from } : {}),
              ...(query.to ? { lte: query.to } : {}),
            },
          }
        : {}),
    };

    return this.prisma.audit_logs.findMany({
      where,
      orderBy: { created_at: 'desc' },
      ...pageArgs(query),
    });
  }

  async findOne(id: string) {
    const log = await this.prisma.audit_logs.findUnique({ where: { id } });
    if (!log) throw new NotFoundException('Audit log not found.');
    return log;
  }
}
