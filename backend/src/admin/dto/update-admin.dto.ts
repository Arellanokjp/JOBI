import { PartialType, OmitType } from '@nestjs/mapped-types';
import { Transform } from 'class-transformer';
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { AdminCreateUserDto } from './create-admin.dto';
import { ACCOUNT_STATUSES, ROLE_NAMES } from '../../common/constants';
import { PaginationQueryDto } from '../../common/pagination.dto';

export class AdminUpdateUserDto extends PartialType(OmitType(AdminCreateUserDto, ['password'] as const)) {}

export class ListUsersQueryDto extends PaginationQueryDto {
  @IsOptional() @IsIn(ROLE_NAMES)
  role?: string;

  @IsOptional() @IsIn(ACCOUNT_STATUSES)
  account_status?: string;

  /** Matches first name, last name, email or phone. */
  @IsOptional() @IsString() @MaxLength(100)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  q?: string;
}
