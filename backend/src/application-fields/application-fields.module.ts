import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ApplicationFieldsController } from './application-fields.controller';
import { ApplicationFieldsService } from './application-fields.service';

@Module({
  imports: [PrismaModule],
  controllers: [ApplicationFieldsController],
  providers: [ApplicationFieldsService],
  exports: [ApplicationFieldsService],
})
export class ApplicationFieldsModule {}
