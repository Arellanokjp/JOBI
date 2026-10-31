import {
  Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { AdminCreateUserDto } from './dto/create-admin.dto';
import { AdminUpdateUserDto, ListUsersQueryDto } from './dto/update-admin.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser, type AuthUser } from '../common/auth-user';

/** User administration. Every route here requires the ADMIN role. */
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class AdminController {
  constructor(private readonly service: AdminService) {}

  @Get()
  findAll(@Query() query: ListUsersQueryDto) {
    return this.service.findAll(query);
  }

  // Declared before ':id' so "roles" is not parsed as an id.
  @Get('roles')
  findRoles() {
    return this.service.findRoles();
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.findOne(id);
  }

  @Post()
  create(@Body() dto: AdminCreateUserDto, @CurrentUser() admin: AuthUser) {
    return this.service.create(dto, admin);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AdminUpdateUserDto,
    @CurrentUser() admin: AuthUser,
  ) {
    return this.service.update(id, dto, admin);
  }

  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() admin: AuthUser) {
    return this.service.remove(id, admin);
  }
}
