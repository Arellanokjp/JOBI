import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { JobCategoriesController } from './job-categories.controller';
import { JobCategoriesService } from './job-categories.service';

@Module({
  imports: [PrismaModule],
  controllers: [JobCategoriesController],
  providers: [JobCategoriesService],
  exports: [JobCategoriesService],
})
export class JobCategoriesModule {}
