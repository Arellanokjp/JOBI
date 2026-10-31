import { OmitType, PartialType } from '@nestjs/mapped-types';
import { CreateCompanyBranchDto } from './create-company-branches.dto';

export class UpdateCompanyBranchDto extends PartialType(
  OmitType(CreateCompanyBranchDto, ['company_id'] as const),
) {}
