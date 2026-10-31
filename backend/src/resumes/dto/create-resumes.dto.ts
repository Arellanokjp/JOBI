import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateResumeDto {
  @IsOptional() @IsString() @MaxLength(10000)
  professional_summary?: string;

  @IsOptional() @IsString() @MaxLength(500)
  resume_file_url?: string;
}
