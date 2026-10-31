import {
  Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards,
} from '@nestjs/common';
import { CompanyVerificationService } from './company-verification.service';
import { ListVerificationQueryDto, ReviewVerificationDto } from './dto/update-company-verification.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser, type AuthUser } from '../common/auth-user';

@Controller('company-verification')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('EMPLOYER', 'ADMIN')
export class CompanyVerificationController {
  constructor(private readonly service: CompanyVerificationService) {}

  @Get()
  findAll(@CurrentUser() user: AuthUser, @Query() query: ListVerificationQueryDto) {
    return this.service.findAll(user, query.status);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
    return this.service.findOne(id, user);
  }

  /** Employer asks for their company to be reviewed. */
  @Post()
  @Roles('EMPLOYER')
  request(@CurrentUser() user: AuthUser) {
    return this.service.request(user);
  }

  /** Administrator approves or rejects. */
  @Patch(':id/review')
  @Roles('ADMIN')
  review(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReviewVerificationDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.review(id, dto, user);
  }
}
