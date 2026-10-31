import {
  Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards,
} from '@nestjs/common';
import { IsOptional, IsUUID } from 'class-validator';
import { ApplicationFieldsService } from './application-fields.service';
import { CreateApplicationFieldDto } from './dto/create-application-fields.dto';
import { UpdateApplicationFieldDto } from './dto/update-application-fields.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser, type AuthUser } from '../common/auth-user';

class ListFieldsQuery {
  @IsOptional() @IsUUID()
  application_form_id?: string;
}

@Controller('application-fields')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ApplicationFieldsController {
  constructor(private readonly service: ApplicationFieldsService) {}

  @Get()
  findAll(@CurrentUser() user: AuthUser, @Query() query: ListFieldsQuery) {
    return this.service.findAll(user, query.application_form_id);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
    return this.service.findOne(id, user);
  }

  @Post()
  @Roles('EMPLOYER', 'ADMIN')
  create(@Body() dto: CreateApplicationFieldDto, @CurrentUser() user: AuthUser) {
    return this.service.create(dto, user);
  }

  @Patch(':id')
  @Roles('EMPLOYER', 'ADMIN')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateApplicationFieldDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.update(id, dto, user);
  }

  @Delete(':id')
  @Roles('EMPLOYER', 'ADMIN')
  remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
    return this.service.remove(id, user);
  }
}
