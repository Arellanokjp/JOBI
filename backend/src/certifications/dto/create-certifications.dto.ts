import { IsDateString, IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class CreateCertificationDto {
  /** Optional: defaults to the caller's own resume. */
  @IsOptional() @IsUUID()
  resume_id?: string;

  @IsString() @IsNotEmpty() @MaxLength(255)
  certification_name: string;

  @IsString() @IsNotEmpty() @MaxLength(255)
  issuing_organization: string;

  @IsOptional() @IsString() @MaxLength(255)
  credential_id?: string;

  @IsOptional() @IsDateString()
  issue_date?: string;

  @IsOptional() @IsDateString()
  expiry_date?: string;

  @IsOptional() @IsString() @MaxLength(500)
  credential_url?: string;

  @IsOptional() @IsString() @MaxLength(10000)
  description?: string;
}
