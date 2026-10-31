import {
  IsArray, IsBoolean, IsIn, IsInt, IsNotEmpty, IsOptional, IsString, IsUUID, Matches, MaxLength, Min,
} from 'class-validator';
import { FIELD_TYPES } from '../../common/constants';

export class CreateApplicationFieldDto {
  @IsUUID()
  application_form_id: string;

  /** Machine name, unique within a form (e.g. "years_of_experience"). */
  @IsString() @IsNotEmpty() @MaxLength(100)
  @Matches(/^[a-z][a-z0-9_]*$/, { message: 'field_name must be lower_snake_case.' })
  field_name: string;

  @IsString() @IsNotEmpty() @MaxLength(255)
  field_label: string;

  @IsIn(FIELD_TYPES)
  field_type: string;

  @IsOptional() @IsString() @MaxLength(255)
  placeholder?: string;

  @IsOptional() @IsString() @MaxLength(500)
  help_text?: string;

  @IsOptional() @IsBoolean()
  is_required?: boolean;

  /** Choices for SELECT / RADIO / MULTISELECT: an array of strings. */
  @IsOptional() @IsArray() @IsString({ each: true })
  field_options?: string[];

  @IsOptional() @IsInt() @Min(0)
  display_order?: number;
}
