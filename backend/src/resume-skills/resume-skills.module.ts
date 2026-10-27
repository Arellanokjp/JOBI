import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ResumeSkillsController } from './resume-skills.controller';
import { ResumeSkillsService } from './resume-skills.service';

@Module({
  imports: [PrismaModule],
  controllers: [ResumeSkillsController],
  providers: [ResumeSkillsService],
  exports: [ResumeSkillsService],
})
export class ResumeSkillsModule {}
