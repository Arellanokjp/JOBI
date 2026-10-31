import {
  Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards,
} from '@nestjs/common';
import { IsOptional, IsUUID } from 'class-validator';
import { CompanyBranchesService } from './company-branches.service';
import { CreateCompanyBranchDto } from './dto/create-company-branches.dto';
import { UpdateCompanyBranchDto } from './dto/update-company-branches.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser, type AuthUser } from '../common/auth-user';

class ListBranchesQuery {
  @IsOptional() @IsUUID()
  company_id?: string;
}

@Controller('company-branches')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('EMPLOYER', 'ADMIN')
export class CompanyBranchesController {
  constructor(private readonly service: CompanyBranchesService) {}

  @Get()
  findAll(@CurrentUser() user: AuthUser, @Query() query: ListBranchesQuery) {
    return this.service.findAll(user, query.company_id);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
    return this.service.findOne(id, user);
  }

  @Post()
  create(@Body() dto: CreateCompanyBranchDto, @CurrentUser() user: AuthUser) {
    return this.service.create(dto, user);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCompanyBranchDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.update(id, dto, user);
  }

  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
    return this.service.remove(id, user);
  }
}
