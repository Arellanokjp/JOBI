import {
  Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, UseGuards,
} from '@nestjs/common';
import { ApplicationFormsService } from './application-forms.service';
import { CreateApplicationFormDto } from './dto/create-application-forms.dto';
import { UpdateApplicationFormDto } from './dto/update-application-forms.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser, type AuthUser } from '../common/auth-user';

@Controller('application-forms')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ApplicationFormsController {
  constructor(private readonly service: ApplicationFormsService) {}

  @Get()
  findAll(@CurrentUser() user: AuthUser) {
    return this.service.findAll(user);
  }

  // Declared before ':id' so "job" is not parsed as an id.
  @Get('job/:jobId')
  findByJob(@Param('jobId', ParseUUIDPipe) jobId: string, @CurrentUser() user: AuthUser) {
    return this.service.findByJob(jobId, user);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
    return this.service.findOne(id, user);
  }

  @Post()
  @Roles('EMPLOYER', 'ADMIN')
  create(@Body() dto: CreateApplicationFormDto, @CurrentUser() user: AuthUser) {
    return this.service.create(dto, user);
  }

  @Patch(':id')
  @Roles('EMPLOYER', 'ADMIN')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateApplicationFormDto,
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
