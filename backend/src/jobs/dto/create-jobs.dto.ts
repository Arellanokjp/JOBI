import {
  IsBoolean, IsDateString, IsIn, IsNotEmpty, IsNumber, IsOptional, IsString, IsUUID, MaxLength, Min,
} from 'class-validator';
import { JOB_STATUS } from '../../common/constants';

export class CreateJobDto {
  @IsUUID()
  category_id: string;

  @IsUUID()
  job_type_id: string;

  @IsString() @IsNotEmpty() @MaxLength(255)
  title: string;

  @IsString() @IsNotEmpty() @MaxLength(20000)
  description: string;

  @IsString() @IsNotEmpty() @MaxLength(20000)
  requirements: string;

  @IsOptional() @IsString() @MaxLength(20000)
  responsibilities?: string;

  @IsOptional() @IsNumber({ maxDecimalPlaces: 2 }) @Min(0)
  salary_min?: number;

  @IsOptional() @IsNumber({ maxDecimalPlaces: 2 }) @Min(0)
  salary_max?: number;

  @IsOptional() @IsString() @IsNotEmpty() @MaxLength(10)
  salary_currency?: string;

  @IsOptional() @IsString() @MaxLength(255)
  location?: string;

  @IsOptional() @IsBoolean()
  is_remote?: boolean;

  @IsOptional() @IsDateString()
  application_deadline?: string;

  /** New jobs may start as DRAFT (default) or be published straight away. */
  @IsOptional() @IsIn([JOB_STATUS.DRAFT, JOB_STATUS.PUBLISHED])
  status?: 'DRAFT' | 'PUBLISHED';
}
