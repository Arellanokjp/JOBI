import { PartialType, PickType } from '@nestjs/mapped-types';
import { CreateResumeSkillDto } from './create-resume-skills.dto';

/** Only the proficiency details can change; remove and re-add to swap the skill. */
export class UpdateResumeSkillDto extends PartialType(
  PickType(CreateResumeSkillDto, ['proficiency_level', 'years_of_experience'] as const),
) {}
