import {
  IsDateString, IsIn, IsInt, IsOptional, IsString, IsUrl, IsUUID, Max, MaxLength, Min,
} from 'class-validator';
import { INTERVIEW_TYPES } from '../../common/constants';

export class CreateInterviewDto {
  @IsUUID()
  application_id: string;

  @IsIn(INTERVIEW_TYPES)
  interview_type: string;

  @IsDateString()
  scheduled_at: string;

  @IsOptional() @IsInt() @Min(5) @Max(1440)
  duration_minutes?: number;

  /** Required for VIDEO interviews. */
  @IsOptional() @IsUrl() @MaxLength(500)
  meeting_url?: string;

  /** Required for IN_PERSON interviews. */
  @IsOptional() @IsString() @MaxLength(500)
  location?: string;

  /** Internal notes; never shown to the candidate. */
  @IsOptional() @IsString() @MaxLength(10000)
  notes?: string;
}
