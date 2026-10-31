import { IsIn, IsNumber, IsOptional, IsUUID, Max, Min } from 'class-validator';
import { PROFICIENCY_LEVELS } from '../../common/constants';

export class CreateResumeSkillDto {
  /** Optional: defaults to the caller's own resume. */
  @IsOptional() @IsUUID()
  resume_id?: string;

  @IsUUID()
  skill_id: string;

  @IsOptional() @IsIn(PROFICIENCY_LEVELS)
  proficiency_level?: string;

  @IsOptional() @IsNumber({ maxDecimalPlaces: 1 }) @Min(0) @Max(99.9)
  years_of_experience?: number;
}
