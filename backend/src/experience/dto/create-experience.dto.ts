import {
  IsBoolean, IsDateString, IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength,
} from 'class-validator';

export class CreateExperienceDto {
  /** Optional: defaults to the caller's own resume. */
  @IsOptional() @IsUUID()
  resume_id?: string;

  @IsString() @IsNotEmpty() @MaxLength(255)
  company_name: string;

  @IsString() @IsNotEmpty() @MaxLength(255)
  job_title: string;

  @IsOptional() @IsString() @MaxLength(50)
  employment_type?: string;

  @IsOptional() @IsString() @MaxLength(255)
  location?: string;

  @IsDateString()
  start_date: string;

  @IsOptional() @IsDateString()
  end_date?: string;

  @IsOptional() @IsBoolean()
  is_current?: boolean;

  @IsOptional() @IsString() @MaxLength(10000)
  description?: string;
}
