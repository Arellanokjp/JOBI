import { OmitType, PartialType } from '@nestjs/mapped-types';
import { CreateApplicationFormDto } from './create-application-forms.dto';

export class UpdateApplicationFormDto extends PartialType(
  OmitType(CreateApplicationFormDto, ['job_id'] as const),
) {}
