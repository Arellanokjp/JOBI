import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';

import { PrismaService } from '../prisma/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import type { AuthUser } from '../common/auth-user';
import { ACCOUNT_STATUS } from '../common/constants';
import { pageArgs } from '../common/pagination.dto';
import { AdminCreateUserDto } from './dto/create-admin.dto';
import { AdminUpdateUserDto, ListUsersQueryDto } from './dto/update-admin.dto';

/** Never expose password_hash or google_id. */
const userSelect = {
  id: true,
  first_name: true,
  last_name: true,
  email: true,
  phone_number: true,
  profile_photo_url: true,
  email_verified: true,
  account_status: true,
  last_login_at: true,
  created_at: true,
  updated_at: true,
  roles: { select: { id: true, name: true } },
} satisfies Prisma.usersSelect;

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditLogsService,
  ) {}

  findRoles() {
    return this.prisma.roles.findMany({ orderBy: { name: 'asc' } });
  }

  findAll(query: ListUsersQueryDto) {
    const where: Prisma.usersWhereInput = {
      deleted_at: null,
      ...(query.role ? { roles: { name: query.role } } : {}),
      ...(query.account_status ? { account_status: query.account_status } : {}),
      ...(query.q
        ? {
            OR: [
              { first_name: { contains: query.q } },
              { last_name: { contains: query.q } },
              { email: { contains: query.q } },
              { phone_number: { contains: query.q } },
            ],
          }
        : {}),
    };

    return this.prisma.users.findMany({
      where,
      select: userSelect,
      orderBy: { created_at: 'desc' },
      ...pageArgs(query),
    });
  }

  async findOne(id: string) {
    const user = await this.prisma.users.findFirst({
      where: { id, deleted_at: null },
      select: userSelect,
    });
    if (!user) throw new NotFoundException('User not found.');
    return user;
  }

  private async roleId(name: string): Promise<string> {
    const role = await this.prisma.roles.findUnique({ where: { name }, select: { id: true } });
    if (!role) throw new BadRequestException(`The ${name} role does not exist. Run "npm run db:seed".`);
    return role.id;
  }

  async create(dto: AdminCreateUserDto, admin: AuthUser) {
    const { role, password, email, ...rest } = dto;
    const created = await this.prisma.users.create({
      data: {
        id: randomUUID(),
        ...rest,
        email: email.trim().toLowerCase(),
        role_id: await this.roleId(role),
        password_hash: await bcrypt.hash(password, 12),
        account_status: dto.account_status ?? ACCOUNT_STATUS.ACTIVE,
        email_verified: dto.email_verified ?? true,
      },
      select: userSelect,
    });

    await this.audit.record({
      user_id: admin.id,
      action: 'USER_CREATED',
      entity_type: 'users',
      entity_id: created.id,
      description: `Created ${role} account ${created.email}`,
    });
    return created;
  }

  async update(id: string, dto: AdminUpdateUserDto, admin: AuthUser) {
    await this.findOne(id);

    // An admin cannot lock themselves out or strip their own role.
    if (id === admin.id) {
      if (dto.role !== undefined && dto.role !== 'ADMIN') {
        throw new ConflictException('You cannot change your own role.');
      }
      if (dto.account_status !== undefined && dto.account_status !== ACCOUNT_STATUS.ACTIVE) {
        throw new ConflictException('You cannot deactivate your own account.');
      }
    }

    const { role, email, ...rest } = dto;
    const updated = await this.prisma.users.update({
      where: { id },
      data: {
        ...rest,
        ...(email !== undefined ? { email: email.trim().toLowerCase() } : {}),
        ...(role !== undefined ? { role_id: await this.roleId(role) } : {}),
      },
      select: userSelect,
    });

    await this.audit.record({
      user_id: admin.id,
      action: 'USER_UPDATED',
      entity_type: 'users',
      entity_id: id,
      description: `Changed: ${Object.keys(dto).join(', ')}`,
    });
    return updated;
  }

  /** Soft delete; also deactivates the account. */
  async remove(id: string, admin: AuthUser) {
    if (id === admin.id) {
      throw new ConflictException('You cannot delete your own account.');
    }
    await this.findOne(id);

    const removed = await this.prisma.users.update({
      where: { id },
      data: { deleted_at: new Date(), account_status: ACCOUNT_STATUS.INACTIVE },
      select: userSelect,
    });

    await this.audit.record({
      user_id: admin.id,
      action: 'USER_DELETED',
      entity_type: 'users',
      entity_id: id,
    });
    return removed;
  }
}
