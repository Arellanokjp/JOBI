import { OmitType, PartialType } from '@nestjs/mapped-types';
import { CreateEducationDto } from './create-education.dto';

export class UpdateEducationDto extends PartialType(
  OmitType(CreateEducationDto, ['resume_id'] as const),
) {}
