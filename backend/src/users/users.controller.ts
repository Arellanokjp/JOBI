import {
  Controller,
  Get,
  Patch,
  Delete,
  Param,
  Body,
  Req,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';

import type { Request } from 'express';

import { UsersService } from './users.service';
import { UpdateUserDto } from './dto/update-user.dto';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

interface AuthenticatedRequest extends Request {
  user: {
    id: string;
    role: 'ADMIN' | 'EMPLOYER' | 'JOB_SEEKER';
  };
}

@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
  ) {}

  // GET /api/v1/users
  // Only administrators can list users.
  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  findAll() {
    return this.usersService.findAll();
  }

  // GET /api/v1/users/:id
  // Administrators can view any user.
  // Other users can view only their own profiles.
  @Get(':id')
  @UseGuards(JwtAuthGuard)
  findOne(
    @Param('id') id: string,
    @Req() request: AuthenticatedRequest,
  ) {
    this.ensureSelfOrAdmin(id, request);

    return this.usersService.findOne(id);
  }

  // PATCH /api/v1/users/:id
  // Administrators can update permitted profile fields.
  // Other users can update only their own profiles.
  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  update(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
    @Req() request: AuthenticatedRequest,
  ) {
    this.ensureSelfOrAdmin(id, request);

    return this.usersService.update(
      id,
      updateUserDto,
    );
  }

  // DELETE /api/v1/users/:id
  // Only administrators can deactivate accounts.
  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  deactivate(
    @Param('id') id: string,
  ) {
    return this.usersService.deactivate(id);
  }

  // Reusable permission check.
  private ensureSelfOrAdmin(
    targetUserId: string,
    request: AuthenticatedRequest,
  ): void {
    const currentUser = request.user;

    if (
      currentUser.id !== targetUserId &&
      currentUser.role !== 'ADMIN'
    ) {
      throw new ForbiddenException(
        'You do not have permission to access or modify this user.',
      );
    }
  }
}