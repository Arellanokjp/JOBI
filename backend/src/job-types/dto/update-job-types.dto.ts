import { PartialType } from '@nestjs/mapped-types';
import { CreateJobTypeDto } from './create-job-types.dto';

export class UpdateJobTypeDto extends PartialType(CreateJobTypeDto) {}
