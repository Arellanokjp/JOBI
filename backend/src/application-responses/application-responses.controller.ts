import {
  Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards,
} from '@nestjs/common';
import { IsOptional, IsUUID } from 'class-validator';
import { ApplicationResponsesService } from './application-responses.service';
import { CreateApplicationResponseDto } from './dto/create-application-responses.dto';
import { UpdateApplicationResponseDto } from './dto/update-application-responses.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser, type AuthUser } from '../common/auth-user';

class ListResponsesQuery {
  @IsOptional() @IsUUID()
  application_id?: string;
}

@Controller('application-responses')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ApplicationResponsesController {
  constructor(private readonly service: ApplicationResponsesService) {}

  @Get()
  findAll(@CurrentUser() user: AuthUser, @Query() query: ListResponsesQuery) {
    return this.service.findAll(user, query.application_id);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
    return this.service.findOne(id, user);
  }

  @Post()
  @Roles('JOB_SEEKER')
  create(@Body() dto: CreateApplicationResponseDto, @CurrentUser() user: AuthUser) {
    return this.service.create(dto, user);
  }

  @Patch(':id')
  @Roles('JOB_SEEKER')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateApplicationResponseDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.update(id, dto, user);
  }

  @Delete(':id')
  @Roles('JOB_SEEKER')
  remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
    return this.service.remove(id, user);
  }
}
