import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { CompanyBranchesController } from './company-branches.controller';
import { CompanyBranchesService } from './company-branches.service';

@Module({
  imports: [PrismaModule],
  controllers: [CompanyBranchesController],
  providers: [CompanyBranchesService],
  exports: [CompanyBranchesService],
})
export class CompanyBranchesModule {}
