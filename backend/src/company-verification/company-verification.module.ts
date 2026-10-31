import { Module } from '@nestjs/common';
import { CompanyVerificationController } from './company-verification.controller';
import { CompanyVerificationService } from './company-verification.service';

@Module({
  controllers: [CompanyVerificationController],
  providers: [CompanyVerificationService],
})
export class CompanyVerificationModule {}
