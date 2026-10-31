import { Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsOptional, IsUUID, ValidateNested } from 'class-validator';
import { ResponseValueDto } from '../../application-responses/dto/create-application-responses.dto';

/** One answer sent together with the application. */
export class ApplicationResponseInputDto extends ResponseValueDto {
  @IsUUID()
  application_field_id: string;
}

export class CreateApplicationDto {
  @IsUUID()
  job_id: string;

  /** The applicant's own resume; optional. */
  @IsOptional() @IsUUID()
  resume_id?: string;

  /** Answers to the job's application form. Required fields must be included. */
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => ApplicationResponseInputDto)
  responses?: ApplicationResponseInputDto[];
}
