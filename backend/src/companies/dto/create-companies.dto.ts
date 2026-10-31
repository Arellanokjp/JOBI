import {
  IsEmail, IsNotEmpty, IsOptional, IsString, IsUrl, MaxLength,
} from 'class-validator';

export class CreateCompanyDto {
  @IsString() @IsNotEmpty() @MaxLength(255)
  company_name: string;

  @IsString() @IsNotEmpty() @MaxLength(100)
  registration_number: string;

  @IsString() @IsNotEmpty() @MaxLength(100)
  tax_pin: string;

  @IsEmail() @MaxLength(255)
  email: string;

  @IsString() @IsNotEmpty() @MaxLength(20)
  phone_number: string;

  @IsOptional() @IsUrl() @MaxLength(255)
  website?: string;

  @IsOptional() @IsString() @MaxLength(100)
  industry?: string;

  @IsOptional() @IsString() @MaxLength(10000)
  description?: string;

  @IsOptional() @IsString() @MaxLength(500)
  logo_url?: string;

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
}
