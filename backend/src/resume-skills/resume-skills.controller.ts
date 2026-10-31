import {
  Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, UseGuards,
} from '@nestjs/common';
import { ResumeSkillsService } from './resume-skills.service';
import { CreateResumeSkillDto } from './dto/create-resume-skills.dto';
import { UpdateResumeSkillDto } from './dto/update-resume-skills.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser, type AuthUser } from '../common/auth-user';

@Controller('resume-skills')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ResumeSkillsController {
  constructor(private readonly service: ResumeSkillsService) {}

  @Get()
  findAll(@CurrentUser() user: AuthUser) {
    return this.service.findAll(user);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
    return this.service.findOne(id, user);
  }

  @Post()
  @Roles('JOB_SEEKER')
  create(@Body() dto: CreateResumeSkillDto, @CurrentUser() user: AuthUser) {
    return this.service.create(dto, user);
  }

  @Patch(':id')
  @Roles('JOB_SEEKER')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateResumeSkillDto,
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
