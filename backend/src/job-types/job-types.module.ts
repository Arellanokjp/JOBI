import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { JobTypesController } from './job-types.controller';
import { JobTypesService } from './job-types.service';

@Module({
  imports: [PrismaModule],
  controllers: [JobTypesController],
  providers: [JobTypesService],
  exports: [JobTypesService],
})
export class JobTypesModule {}
