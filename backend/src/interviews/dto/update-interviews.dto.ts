import { OmitType, PartialType } from '@nestjs/mapped-types';
import { IsIn, IsOptional } from 'class-validator';
import { CreateInterviewDto } from './create-interviews.dto';
import { INTERVIEW_STATUSES } from '../../common/constants';

export class UpdateInterviewDto extends PartialType(
  OmitType(CreateInterviewDto, ['application_id'] as const),
) {
  @IsOptional() @IsIn(INTERVIEW_STATUSES)
  status?: string;
}
