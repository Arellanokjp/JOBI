import {
  IsBoolean, IsEmail, IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength,
} from 'class-validator';

export class CreateCompanyBranchDto {
  /** Employers may omit this (their own company is used); admins must send it. */
  @IsOptional() @IsUUID()
  company_id?: string;

  @IsString() @IsNotEmpty() @MaxLength(255)
  branch_name: string;

  @IsString() @IsNotEmpty() @MaxLength(100)
  country: string;

  @IsString() @IsNotEmpty() @MaxLength(100)
  county: string;

  @IsString() @IsNotEmpty() @MaxLength(100)
  city: string;

  @IsString() @IsNotEmpty() @MaxLength(2000)
  physical_address: string;

  @IsOptional() @IsString() @MaxLength(255)
  postal_address?: string;

  @IsOptional() @IsString() @MaxLength(20)
  phone_number?: string;

  @IsOptional() @IsEmail() @MaxLength(255)
  email?: string;

  @IsOptional() @IsBoolean()
  is_head_office?: boolean;
}
