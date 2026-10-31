import {
  BadRequestException, ConflictException, Injectable, NotFoundException,
} from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';

import { PrismaService } from '../prisma/prisma.service';
import { AccessService } from '../common/access.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { createNotification, NOTIFICATION_TYPE } from '../notifications/notify';
import type { AuthUser } from '../common/auth-user';
import { VERIFICATION_STATUS } from '../common/constants';
import { ReviewVerificationDto } from './dto/update-company-verification.dto';

@Injectable()
export class CompanyVerificationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: AccessService,
    private readonly audit: AuditLogsService,
  ) {}

  private visibleWhere(user: AuthUser): Prisma.verification_attemptsWhereInput {
    return user.role === 'ADMIN'
      ? {}
      : { companies: { owner_user_id: user.id, deleted_at: null } };
  }

  findAll(user: AuthUser, status?: string) {
    return this.prisma.verification_attempts.findMany({
      where: { ...this.visibleWhere(user), ...(status ? { status } : {}) },
      include: { companies: { select: { id: true, company_name: true, verification_status: true } } },
      orderBy: { created_at: 'desc' },
    });
  }

  async findOne(id: string, user: AuthUser) {
    const attempt = await this.prisma.verification_attempts.findFirst({
      where: { id, ...this.visibleWhere(user) },
      include: { companies: { select: { id: true, company_name: true, verification_status: true } } },
    });
    if (!attempt) throw new NotFoundException('Verification attempt not found.');
    return attempt;
  }

  /** An employer asks for their company to be (re)reviewed. */
  async request(user: AuthUser) {
    const company = await this.access.getOwnCompany(user.id);

    if (company.verification_status === VERIFICATION_STATUS.APPROVED) {
      throw new ConflictException('Your company is already approved.');
    }

    return this.prisma.$transaction(async (tx) => {
      const pending = await tx.verification_attempts.findFirst({
        where: { company_id: company.id, status: VERIFICATION_STATUS.PENDING },
      });
      if (pending) {
        throw new ConflictException('A verification request is already awaiting review.');
      }

      const attemptNumber =
        (await tx.verification_attempts.count({ where: { company_id: company.id } })) + 1;

      await tx.companies.update({
        where: { id: company.id },
        data: { verification_status: VERIFICATION_STATUS.PENDING, verified_at: null },
      });

      return tx.verification_attempts.create({
        data: {
          id: randomUUID(),
          company_id: company.id,
          attempt_number: attemptNumber,
          status: VERIFICATION_STATUS.PENDING,
        },
      });
    });
  }

  /** An administrator approves or rejects a pending attempt. */
  async review(id: string, dto: ReviewVerificationDto, admin: AuthUser) {
    if (dto.status === VERIFICATION_STATUS.REJECTED && !dto.reason?.trim()) {
      throw new BadRequestException('A reason is required when rejecting a company.');
    }

    const attempt = await this.prisma.verification_attempts.findUnique({
      where: { id },
      include: { companies: { select: { owner_user_id: true, company_name: true } } },
    });
    if (!attempt) throw new NotFoundException('Verification attempt not found.');

    const now = new Date();

    const updated = await this.prisma.$transaction(async (tx) => {
      // Only a still-pending attempt can be decided (guards against double review).
      const claimed = await tx.verification_attempts.updateMany({
        where: { id, status: VERIFICATION_STATUS.PENDING },
        data: {
          status: dto.status,
          reason: dto.reason?.trim() || null,
          reviewed_by_user_id: admin.id,
          reviewed_at: now,
        },
      });
      if (claimed.count !== 1) {
        throw new ConflictException('This verification attempt has already been reviewed.');
      }

      await tx.companies.update({
        where: { id: attempt.company_id },
        data: {
          verification_status: dto.status,
          verified_at: dto.status === VERIFICATION_STATUS.APPROVED ? now : null,
        },
      });

      await createNotification(tx, {
        user_id: attempt.companies.owner_user_id,
        title:
          dto.status === VERIFICATION_STATUS.APPROVED
            ? 'Company approved'
            : 'Company verification rejected',
        message:
          dto.status === VERIFICATION_STATUS.APPROVED
            ? `${attempt.companies.company_name} has been approved. You can now publish jobs.`
            : `${attempt.companies.company_name} was not approved: ${dto.reason}`,
        notification_type: NOTIFICATION_TYPE.COMPANY_VERIFICATION,
      });

      return tx.verification_attempts.findUniqueOrThrow({ where: { id } });
    });

    await this.audit.record({
      user_id: admin.id,
      action: `COMPANY_VERIFICATION_${dto.status}`,
      entity_type: 'companies',
      entity_id: attempt.company_id,
      description: dto.reason ?? null,
    });

    return updated;
  }
}
