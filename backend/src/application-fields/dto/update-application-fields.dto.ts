import { OmitType, PartialType } from '@nestjs/mapped-types';
import { CreateApplicationFieldDto } from './create-application-fields.dto';

export class UpdateApplicationFieldDto extends PartialType(
  OmitType(CreateApplicationFieldDto, ['application_form_id'] as const),
) {}
