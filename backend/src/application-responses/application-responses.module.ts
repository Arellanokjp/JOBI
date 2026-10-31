import { Module } from '@nestjs/common';
import { ApplicationResponsesController } from './application-responses.controller';
import { ApplicationResponsesService } from './application-responses.service';

@Module({
  controllers: [ApplicationResponsesController],
  providers: [ApplicationResponsesService],
})
export class ApplicationResponsesModule {}
