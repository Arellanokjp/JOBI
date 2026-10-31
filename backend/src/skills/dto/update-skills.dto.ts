import { PartialType } from '@nestjs/mapped-types';
import { CreateSkillDto } from './create-skills.dto';

export class UpdateSkillDto extends PartialType(CreateSkillDto) {}
