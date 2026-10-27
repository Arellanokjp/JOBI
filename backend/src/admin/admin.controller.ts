import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { AdminService } from './admin.service';
import { CreateResourceDto } from './dto/create-admin.dto';
import { UpdateResourceDto } from './dto/update-admin.dto';
import { JobiJwtAuthGuard } from '../common/jobi-jwt-auth.guard';
import { jobiRole, jobiUserId, JobiRequestUser } from '../common/jobi-request-user';

@Controller('admin')
export class AdminController {
  constructor(private readonly service: AdminService) {}

  @Get()
  @UseGuards(JobiJwtAuthGuard)
  findAll(@Req() req: Request) {
    const user = (req as any).user as JobiRequestUser | undefined;
    return this.service.findAll(jobiUserId(user), jobiRole(user));
  }

  @Get(':id')
  @UseGuards(JobiJwtAuthGuard)
  findOne(@Param('id') id: string, @Req() req: Request) {
    const user = (req as any).user as JobiRequestUser | undefined;
    return this.service.findOne(id, jobiUserId(user), jobiRole(user));
  }

  @Post()
  @UseGuards(JobiJwtAuthGuard)
  create(@Body() dto: CreateResourceDto, @Req() req: Request) {
    const user = (req as any).user as JobiRequestUser | undefined;
    return this.service.create(dto as Record<string, unknown>, jobiUserId(user), jobiRole(user));
  }

  @Patch(':id')
  @UseGuards(JobiJwtAuthGuard)
  update(@Param('id') id: string, @Body() dto: UpdateResourceDto, @Req() req: Request) {
    const user = (req as any).user as JobiRequestUser | undefined;
    return this.service.update(id, dto as Record<string, unknown>, jobiUserId(user), jobiRole(user));
  }

  @Delete(':id')
  @UseGuards(JobiJwtAuthGuard)
  remove(@Param('id') id: string, @Req() req: Request) {
    const user = (req as any).user as JobiRequestUser | undefined;
    return this.service.remove(id, jobiUserId(user), jobiRole(user));
  }
}

