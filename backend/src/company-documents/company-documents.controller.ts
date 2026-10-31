import {
  Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards,
} from '@nestjs/common';
import { IsOptional, IsUUID } from 'class-validator';
import { CompanyDocumentsService } from './company-documents.service';
import { CreateCompanyDocumentDto } from './dto/create-company-documents.dto';
import { ReviewCompanyDocumentDto, UpdateCompanyDocumentDto } from './dto/update-company-documents.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser, type AuthUser } from '../common/auth-user';

class ListDocumentsQuery {
  @IsOptional() @IsUUID()
  company_id?: string;
}

@Controller('company-documents')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('EMPLOYER', 'ADMIN')
export class CompanyDocumentsController {
  constructor(private readonly service: CompanyDocumentsService) {}

  @Get()
  findAll(@CurrentUser() user: AuthUser, @Query() query: ListDocumentsQuery) {
    return this.service.findAll(user, query.company_id);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
    return this.service.findOne(id, user);
  }

  @Post()
  create(@Body() dto: CreateCompanyDocumentDto, @CurrentUser() user: AuthUser) {
    return this.service.create(dto, user);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCompanyDocumentDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.update(id, dto, user);
  }

  /** Administrators approve or reject a document. */
  @Patch(':id/review')
  @Roles('ADMIN')
  review(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReviewCompanyDocumentDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.review(id, dto, user);
  }

  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
    return this.service.remove(id, user);
  }
}
