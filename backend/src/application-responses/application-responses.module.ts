import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ApplicationResponsesController } from './application-responses.controller';
import { ApplicationResponsesService } from './application-responses.service';

@Module({
  imports: [PrismaModule],
  controllers: [ApplicationResponsesController],
  providers: [ApplicationResponsesService],
  exports: [ApplicationResponsesService],
})
export class ApplicationResponsesModule {}
