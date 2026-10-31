import { PartialType } from '@nestjs/mapped-types';
import { CreateCompanyDto } from './create-companies.dto';

export class UpdateCompanyDto extends PartialType(CreateCompanyDto) {}
