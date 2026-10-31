import { OmitType, PartialType } from '@nestjs/mapped-types';
import { IsIn, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { CreateCompanyDocumentDto } from './create-company-documents.dto';
import { DOCUMENT_STATUS } from '../../common/constants';

export class UpdateCompanyDocumentDto extends PartialType(
  OmitType(CreateCompanyDocumentDto, ['company_id'] as const),
) {}

/** Admin review of an uploaded document. */
export class ReviewCompanyDocumentDto {
  @IsIn([DOCUMENT_STATUS.APPROVED, DOCUMENT_STATUS.REJECTED])
  document_status: 'APPROVED' | 'REJECTED';

  @IsOptional() @IsString() @IsNotEmpty() @MaxLength(2000)
  rejection_reason?: string;
}
