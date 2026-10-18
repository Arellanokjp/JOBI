import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';


import { UpdateUserDto } from './dto/update-user.dto';

import * as bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  // Fields that are safe to return in API responses.
  private readonly publicUserSelect = {
    id: true,
    first_name: true,
    last_name: true,
    email: true,
    phone_number: true,
    email_verified: true,
    account_status: true,
    created_at: true,
    updated_at: true,
  };

  // Check whether a user has already been deactivated.
  private async findActiveUser(id: string) {
    const user = await this.prisma.users.findFirst({
      where: {
        id,
        deleted_at: null,
      },
      select: this.publicUserSelect,
    });

    if (!user) {
      throw new NotFoundException(
        `User with ID ${id} not found`,
      );
    }

    return user;
  }

  // Handle duplicate email and phone number errors.
  private handleDatabaseError(error: unknown): never {
    if (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === 'P2002'
    ) {
      throw new ConflictException(
        'The email address or phone number is already registered.',
      );
    }

    throw error;
  }

  // GET /api/v1/users
  async findAll() {
    return this.prisma.users.findMany({
      where: {
        deleted_at: null,
      },
      select: this.publicUserSelect,
      orderBy: {
        created_at: 'desc',
      },
    });
  }

  // GET /api/v1/users/:id
  async findOne(id: string) {
    return this.findActiveUser(id);
  }

  // PATCH /api/v1/users/:id
  async update(
  id: string,
  updateUserDto: UpdateUserDto,
) {
  await this.findActiveUser(id);

  const {
    first_name,
    last_name,
    email,
    phone_number,
  } = updateUserDto;

  const data: {
    first_name?: string;
    last_name?: string;
    email?: string;
    phone_number?: string;
    updated_at: Date;
  } = {
    updated_at: new Date(),
  };

  if (first_name !== undefined) {
    data.first_name = first_name;
  }

  if (last_name !== undefined) {
    data.last_name = last_name;
  }

  if (email !== undefined) {
    data.email = email;
  }

  if (phone_number !== undefined) {
    data.phone_number = phone_number;
  }

  try {
    return await this.prisma.users.update({
      where: {
        id,
      },
      data,
      select: this.publicUserSelect,
    });
  } catch (error) {
    return this.handleDatabaseError(error);
  }
}

  // DELETE /api/v1/users/:id
  // Soft-deletes a user instead of permanently removing the record.
  async deactivate(id: string) {
    await this.findActiveUser(id);

    return this.prisma.users.update({
      where: {
        id,
      },
      data: {
        account_status: 'INACTIVE',
        deleted_at: new Date(),
        updated_at: new Date(),
      },
      select: this.publicUserSelect,
    });
  }
}