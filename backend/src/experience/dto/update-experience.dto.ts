import { OmitType, PartialType } from '@nestjs/mapped-types';
import { CreateExperienceDto } from './create-experience.dto';

export class UpdateExperienceDto extends PartialType(
  OmitType(CreateExperienceDto, ['resume_id'] as const),
) {}
