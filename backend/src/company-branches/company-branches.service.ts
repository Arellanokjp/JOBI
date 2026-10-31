import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';

import { PrismaService } from '../prisma/prisma.service';
import { AccessService } from '../common/access.service';
import type { AuthUser } from '../common/auth-user';
import { CreateCompanyBranchDto } from './dto/create-company-branches.dto';
import { UpdateCompanyBranchDto } from './dto/update-company-branches.dto';

@Injectable()
export class CompanyBranchesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: AccessService,
  ) {}

  /** Admins see everything; employers only branches of their own company. */
  private visibleWhere(user: AuthUser): Prisma.company_branchesWhereInput {
    return user.role === 'ADMIN'
      ? { deleted_at: null }
      : { deleted_at: null, companies: { owner_user_id: user.id, deleted_at: null } };
  }

  findAll(user: AuthUser, companyId?: string) {
    return this.prisma.company_branches.findMany({
      where: { ...this.visibleWhere(user), ...(companyId ? { company_id: companyId } : {}) },
      orderBy: [{ is_head_office: 'desc' }, { created_at: 'asc' }],
    });
  }

  async findOne(id: string, user: AuthUser) {
    const branch = await this.prisma.company_branches.findFirst({
      where: { id, ...this.visibleWhere(user) },
    });
    if (!branch) throw new NotFoundException('Branch not found.');
    return branch;
  }

  async create(dto: CreateCompanyBranchDto, user: AuthUser) {
    let companyId: string;
    if (user.role === 'ADMIN') {
      if (!dto.company_id) throw new BadRequestException('company_id is required.');
      companyId = dto.company_id;
    } else {
      companyId = (await this.access.getOwnCompany(user.id)).id;
    }

    const { company_id: _ignored, ...fields } = dto;
    void _ignored;

    return this.prisma.$transaction(async (tx) => {
      // A company has at most one head office.
      if (fields.is_head_office) {
        await tx.company_branches.updateMany({
          where: { company_id: companyId, is_head_office: true },
          data: { is_head_office: false },
        });
      }
      return tx.company_branches.create({
        data: { ...fields, id: randomUUID(), company_id: companyId },
      });
    });
  }

  async update(id: string, dto: UpdateCompanyBranchDto, user: AuthUser) {
    const branch = await this.findOne(id, user);

    return this.prisma.$transaction(async (tx) => {
      if (dto.is_head_office) {
        await tx.company_branches.updateMany({
          where: { company_id: branch.company_id, is_head_office: true, id: { not: id } },
          data: { is_head_office: false },
        });
      }
      return tx.company_branches.update({ where: { id }, data: dto });
    });
  }

  /** Soft delete. */
  async remove(id: string, user: AuthUser) {
    await this.findOne(id, user);
    return this.prisma.company_branches.update({
      where: { id },
      data: { deleted_at: new Date(), is_head_office: false },
    });
  }
}
