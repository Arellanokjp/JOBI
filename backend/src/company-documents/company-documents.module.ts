import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { CompanyDocumentsController } from './company-documents.controller';
import { CompanyDocumentsService } from './company-documents.service';

@Module({
  imports: [PrismaModule],
  controllers: [CompanyDocumentsController],
  providers: [CompanyDocumentsService],
  exports: [CompanyDocumentsService],
})
export class CompanyDocumentsModule {}
