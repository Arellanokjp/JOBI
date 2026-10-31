import { Module } from '@nestjs/common';
import { ResumeSkillsController } from './resume-skills.controller';
import { ResumeSkillsService } from './resume-skills.service';

@Module({
  controllers: [ResumeSkillsController],
  providers: [ResumeSkillsService],
})
export class ResumeSkillsModule {}
