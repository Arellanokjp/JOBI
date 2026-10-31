import { OmitType, PartialType } from '@nestjs/mapped-types';
import { CreateCertificationDto } from './create-certifications.dto';

export class UpdateCertificationDto extends PartialType(
  OmitType(CreateCertificationDto, ['resume_id'] as const),
) {}
