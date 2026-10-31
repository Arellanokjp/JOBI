import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';

import { PrismaService } from '../prisma/prisma.service';
import { AccessService } from '../common/access.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import type { AuthUser } from '../common/auth-user';
import { DOCUMENT_STATUS } from '../common/constants';
import { CreateCompanyDocumentDto } from './dto/create-company-documents.dto';
import { ReviewCompanyDocumentDto, UpdateCompanyDocumentDto } from './dto/update-company-documents.dto';

@Injectable()
export class CompanyDocumentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: AccessService,
    private readonly audit: AuditLogsService,
  ) {}

  private visibleWhere(user: AuthUser): Prisma.company_documentsWhereInput {
    return user.role === 'ADMIN'
      ? { deleted_at: null }
      : { deleted_at: null, companies: { owner_user_id: user.id, deleted_at: null } };
  }

  findAll(user: AuthUser, companyId?: string) {
    return this.prisma.company_documents.findMany({
      where: { ...this.visibleWhere(user), ...(companyId ? { company_id: companyId } : {}) },
      orderBy: { uploaded_at: 'desc' },
    });
  }

  async findOne(id: string, user: AuthUser) {
    const doc = await this.prisma.company_documents.findFirst({
      where: { id, ...this.visibleWhere(user) },
    });
    if (!doc) throw new NotFoundException('Document not found.');
    return doc;
  }

  async create(dto: CreateCompanyDocumentDto, user: AuthUser) {
    let companyId: string;
    if (user.role === 'ADMIN') {
      if (!dto.company_id) throw new BadRequestException('company_id is required.');
      companyId = dto.company_id;
    } else {
      companyId = (await this.access.getOwnCompany(user.id)).id;
    }

    const { company_id: _ignored, expires_at, ...fields } = dto;
    void _ignored;

    return this.prisma.company_documents.create({
      data: {
        ...fields,
        id: randomUUID(),
        company_id: companyId,
        expires_at: expires_at ? new Date(expires_at) : null,
        document_status: DOCUMENT_STATUS.PENDING,
      },
    });
  }

  async update(id: string, dto: UpdateCompanyDocumentDto, user: AuthUser) {
    await this.findOne(id, user);
    const { expires_at, ...fields } = dto;

    return this.prisma.company_documents.update({
      where: { id },
      data: {
        ...fields,
        ...(expires_at !== undefined ? { expires_at: new Date(expires_at) } : {}),
        // Replacing the file or its details sends the document back for review.
        document_status: DOCUMENT_STATUS.PENDING,
        rejection_reason: null,
      },
    });
  }

  async review(id: string, dto: ReviewCompanyDocumentDto, admin: AuthUser) {
    await this.findOne(id, admin);

    if (dto.document_status === DOCUMENT_STATUS.REJECTED && !dto.rejection_reason) {
      throw new BadRequestException('A rejection_reason is required when rejecting a document.');
    }

    const updated = await this.prisma.company_documents.update({
      where: { id },
      data: {
        document_status: dto.document_status,
        rejection_reason:
          dto.document_status === DOCUMENT_STATUS.REJECTED ? dto.rejection_reason : null,
      },
    });

    await this.audit.record({
      user_id: admin.id,
      action: `COMPANY_DOCUMENT_${dto.document_status}`,
      entity_type: 'company_documents',
      entity_id: id,
      description: dto.rejection_reason ?? null,
    });

    return updated;
  }

  /** Soft delete. */
  async remove(id: string, user: AuthUser) {
    await this.findOne(id, user);
    return this.prisma.company_documents.update({
      where: { id },
      data: { deleted_at: new Date() },
    });
  }
}
