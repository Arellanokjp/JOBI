import { IsDateString, IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class CreateEducationDto {
  /** Optional: defaults to the caller's own resume. */
  @IsOptional() @IsUUID()
  resume_id?: string;

  @IsString() @IsNotEmpty() @MaxLength(255)
  institution_name: string;

  @IsString() @IsNotEmpty() @MaxLength(255)
  qualification: string;

  @IsOptional() @IsString() @MaxLength(255)
  field_of_study?: string;

  @IsOptional() @IsDateString()
  start_date?: string;

  @IsOptional() @IsDateString()
  end_date?: string;

  @IsOptional() @IsString() @MaxLength(10000)
  description?: string;
}
