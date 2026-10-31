import { IsDateString, IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class CreateCompanyDocumentDto {
  /** Employers may omit this (their own company is used); admins must send it. */
  @IsOptional() @IsUUID()
  company_id?: string;

  @IsString() @IsNotEmpty() @MaxLength(100)
  document_type: string;

  @IsOptional() @IsString() @MaxLength(100)
  document_number?: string;

  @IsString() @IsNotEmpty() @MaxLength(500)
  file_url: string;

  @IsOptional() @IsString() @MaxLength(255)
  original_file_name?: string;

  @IsOptional() @IsString() @MaxLength(100)
  file_type?: string;

  @IsOptional() @IsDateString()
  expires_at?: string;
}
