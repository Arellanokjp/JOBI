import { OmitType, PartialType } from '@nestjs/mapped-types';
import { Transform } from 'class-transformer';
import { IsBoolean, IsIn, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { CreateJobDto } from './create-jobs.dto';
import { JOB_STATUSES } from '../../common/constants';
import { PaginationQueryDto } from '../../common/pagination.dto';

export class UpdateJobDto extends PartialType(OmitType(CreateJobDto, ['status'] as const)) {
  @IsOptional() @IsIn(JOB_STATUSES)
  status?: string;
}

export class ListJobsQueryDto extends PaginationQueryDto {
  /** Free-text search over title, description and location. */
  @IsOptional() @IsString() @MaxLength(100)
  q?: string;

  @IsOptional() @IsUUID()
  category_id?: string;

  @IsOptional() @IsUUID()
  job_type_id?: string;

  @IsOptional() @IsUUID()
  company_id?: string;

  @IsOptional() @IsString() @MaxLength(255)
  location?: string;

  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  is_remote?: boolean;

  /** Only honoured for employers and admins; job seekers always see PUBLISHED jobs. */
  @IsOptional() @IsIn(JOB_STATUSES)
  status?: string;
}

