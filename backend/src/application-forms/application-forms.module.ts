import { Module } from '@nestjs/common';
import { ApplicationFormsController } from './application-forms.controller';
import { ApplicationFormsService } from './application-forms.service';

@Module({
  controllers: [ApplicationFormsController],
  providers: [ApplicationFormsService],
  exports: [ApplicationFormsService],
})
export class ApplicationFormsModule {}
