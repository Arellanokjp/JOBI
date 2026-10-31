import {
  Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards,
} from '@nestjs/common';
import { IsOptional, IsUUID } from 'class-validator';
import { InterviewsService } from './interviews.service';
import { CreateInterviewDto } from './dto/create-interviews.dto';
import { UpdateInterviewDto } from './dto/update-interviews.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser, type AuthUser } from '../common/auth-user';

class ListInterviewsQuery {
  @IsOptional() @IsUUID()
  application_id?: string;
}

@Controller('interviews')
@UseGuards(JwtAuthGuard, RolesGuard)
export class InterviewsController {
  constructor(private readonly service: InterviewsService) {}

  @Get()
  findAll(@CurrentUser() user: AuthUser, @Query() query: ListInterviewsQuery) {
    return this.service.findAll(user, query.application_id);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
    return this.service.findOne(id, user);
  }

  @Post()
  @Roles('EMPLOYER', 'ADMIN')
  create(@Body() dto: CreateInterviewDto, @CurrentUser() user: AuthUser) {
    return this.service.create(dto, user);
  }

  @Patch(':id')
  @Roles('EMPLOYER', 'ADMIN')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateInterviewDto,
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
