import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { VERIFICATION_STATUS } from '../../common/constants';

/** Admin decision on a verification attempt. */
export class ReviewVerificationDto {
  @IsIn([VERIFICATION_STATUS.APPROVED, VERIFICATION_STATUS.REJECTED])
  status: 'APPROVED' | 'REJECTED';

  /** Required when rejecting so the employer knows what to fix. */
  @IsOptional() @IsString() @MaxLength(5000)
  reason?: string;
}

export class ListVerificationQueryDto {
  @IsOptional() @IsIn(Object.values(VERIFICATION_STATUS))
  status?: string;
}
