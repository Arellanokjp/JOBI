import { IsBoolean, IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class CreateApplicationFormDto {
  @IsUUID()
  job_id: string;

  @IsString() @IsNotEmpty() @MaxLength(255)
  title: string;

  @IsOptional() @IsString() @MaxLength(10000)
  description?: string;

  @IsOptional() @IsBoolean()
  is_active?: boolean;
}
