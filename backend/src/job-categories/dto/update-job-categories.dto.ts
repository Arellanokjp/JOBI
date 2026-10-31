import { PartialType } from '@nestjs/mapped-types';
import { CreateJobCategoryDto } from './create-job-categories.dto';

export class UpdateJobCategoryDto extends PartialType(CreateJobCategoryDto) {}
