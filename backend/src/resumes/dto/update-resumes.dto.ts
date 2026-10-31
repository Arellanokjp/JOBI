import { PartialType } from '@nestjs/mapped-types';
import { CreateResumeDto } from './create-resumes.dto';

export class UpdateResumeDto extends PartialType(CreateResumeDto) {}
