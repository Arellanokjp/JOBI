import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';

import { PrismaService } from '../prisma/prisma.service';
import type { AuthUser } from '../common/auth-user';
import { VERIFICATION_STATUS } from '../common/constants';
import { CreateCompanyDto } from './dto/create-companies.dto';
import { UpdateCompanyDto } from './dto/update-companies.dto';

/** What job seekers may see about a company (no registration/tax details). */
const publicCompanySelect = {
  id: true,
  company_name: true,
  website: true,
  industry: true,
  description: true,
  logo_url: true,
  country: true,
  county: true,
  city: true,
  verification_status: true,
} satisfies Prisma.companiesSelect;

@Injectable()
export class CompaniesService {
  constructor(private readonly prisma: PrismaService) {}

  /** Which companies the caller may see. */
  private visibleWhere(user: AuthUser): Prisma.companiesWhereInput {
    switch (user.role) {
      case 'ADMIN':
        return { deleted_at: null };
      case 'EMPLOYER':
        return { deleted_at: null, owner_user_id: user.id };
      default:
        return { deleted_at: null, verification_status: VERIFICATION_STATUS.APPROVED };
    }
  }

  findAll(user: AuthUser) {
    return this.prisma.companies.findMany({
      where: this.visibleWhere(user),
      ...(user.role === 'JOB_SEEKER' ? { select: publicCompanySelect } : {}),
      orderBy: { created_at: 'desc' },
    });
  }

  async findOne(id: string, user: AuthUser) {
    const company = await this.prisma.companies.findFirst({
      where: { id, ...this.visibleWhere(user) },
      ...(user.role === 'JOB_SEEKER' ? { select: publicCompanySelect } : {}),
    });
    if (!company) throw new NotFoundException('Company not found.');
    return company;
  }

  /** An employer may own exactly one company (owner_user_id is unique). */
  async create(dto: CreateCompanyDto, user: AuthUser) {
    const data = {
      ...dto,
      email: dto.email.trim().toLowerCase(),
      verification_status: VERIFICATION_STATUS.PENDING,
      verified_at: null,
      deleted_at: null,
    };

    const existing = await this.prisma.companies.findUnique({
      where: { owner_user_id: user.id },
    });

    if (existing && !existing.deleted_at) {
      throw new ConflictException('You have already created a company profile.');
    }

    // A previously deleted profile is restored so the unique owner link stays valid.
    if (existing) {
      return this.prisma.companies.update({ where: { id: existing.id }, data });
    }

    return this.prisma.companies.create({
      data: { ...data, id: randomUUID(), owner_user_id: user.id },
    });
  }

  async update(id: string, dto: UpdateCompanyDto, user: AuthUser) {
    await this.findOne(id, user);
    return this.prisma.companies.update({
      where: { id },
      data: {
        ...dto,
        ...(dto.email !== undefined ? { email: dto.email.trim().toLowerCase() } : {}),
      },
    });
  }

  /** Soft delete. */
  async remove(id: string, user: AuthUser) {
    await this.findOne(id, user);
    return this.prisma.companies.update({
      where: { id },
      data: { deleted_at: new Date() },
    });
  }
}
