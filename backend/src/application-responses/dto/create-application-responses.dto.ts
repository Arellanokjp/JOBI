import {
  IsDateString, IsNumber, IsOptional, IsString, IsUUID, MaxLength,
} from 'class-validator';

/**
 * The answer to one field. Exactly one of these is used, depending on the
 * field's type:
 *   TEXT/TEXTAREA/SELECT/RADIO → response_text
 *   MULTISELECT                → response_text as a JSON array string, e.g. '["a","b"]'
 *   CHECKBOX                   → response_text "true" | "false"
 *   NUMBER                     → response_number
 *   DATE                       → response_date
 *   FILE                       → file_url
 */
export class ResponseValueDto {
  @IsOptional() @IsString() @MaxLength(10000)
  response_text?: string;

  @IsOptional() @IsNumber({ maxDecimalPlaces: 4 })
  response_number?: number;

  @IsOptional() @IsDateString()
  response_date?: string;

  @IsOptional() @IsString() @MaxLength(500)
  file_url?: string;
}

export class CreateApplicationResponseDto extends ResponseValueDto {
  @IsUUID()
  application_id: string;

  @IsUUID()
  application_field_id: string;
}
