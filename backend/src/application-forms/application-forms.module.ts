import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ApplicationFormsController } from './application-forms.controller';
import { ApplicationFormsService } from './application-forms.service';

@Module({
  imports: [PrismaModule],
  controllers: [ApplicationFormsController],
  providers: [ApplicationFormsService],
  exports: [ApplicationFormsService],
})
export class ApplicationFormsModule {}
