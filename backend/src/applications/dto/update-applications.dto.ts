import { IsIn, IsOptional, IsString, IsUUID } from 'class-validator';
import { EMPLOYER_APPLICATION_STATUSES } from '../../common/constants';
import { PaginationQueryDto } from '../../common/pagination.dto';

/**
 * Employers/admins send `status`; job seekers may send `resume_id`
 * (while the application is still SUBMITTED). The service enforces who may send what.
 */
export class UpdateApplicationDto {
  @IsOptional() @IsIn(EMPLOYER_APPLICATION_STATUSES)
  status?: string;

  @IsOptional() @IsUUID()
  resume_id?: string;
}

export class ListApplicationsQueryDto extends PaginationQueryDto {
  @IsOptional() @IsUUID()
  job_id?: string;

  @IsOptional() @IsString()
  status?: string;
}

