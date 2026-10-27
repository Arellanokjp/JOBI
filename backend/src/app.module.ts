import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './users/users.module';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { EmailModule } from './email/email.module';
import { CompaniesModule } from './companies/companies.module';
import { CompanyBranchesModule } from './company-branches/company-branches.module';
import { CompanyDocumentsModule } from './company-documents/company-documents.module';
import { CompanyVerificationModule } from './company-verification/company-verification.module';
import { JobsModule } from './jobs/jobs.module';
import { JobCategoriesModule } from './job-categories/job-categories.module';
import { JobTypesModule } from './job-types/job-types.module';
import { ApplicationFormsModule } from './application-forms/application-forms.module';
import { ApplicationFieldsModule } from './application-fields/application-fields.module';
import { ApplicationsModule } from './applications/applications.module';
import { ApplicationResponsesModule } from './application-responses/application-responses.module';
import { ResumesModule } from './resumes/resumes.module';
import { EducationModule } from './education/education.module';
import { ExperienceModule } from './experience/experience.module';
import { CertificationsModule } from './certifications/certifications.module';
import { SkillsModule } from './skills/skills.module';
import { ResumeSkillsModule } from './resume-skills/resume-skills.module';
import { SavedJobsModule } from './saved-jobs/saved-jobs.module';
import { InterviewsModule } from './interviews/interviews.module';
import { NotificationsModule } from './notifications/notifications.module';
import { AuditLogsModule } from './audit-logs/audit-logs.module';
import { AdminModule } from './admin/admin.module';
import { PasswordRecoveryModule } from './password-recovery/password-recovery.module';


@Module({
  imports: [
    UsersModule, 
    PrismaModule, 
    AuthModule, 
    EmailModule, 
    CompaniesModule,
    CompanyBranchesModule,
    CompanyDocumentsModule,
    CompanyVerificationModule,
    JobsModule,
    JobCategoriesModule,
    JobTypesModule,
    ApplicationFormsModule,
    ApplicationFieldsModule,
    ApplicationsModule,
    ApplicationResponsesModule,
    ResumesModule,
    EducationModule,
    ExperienceModule,
    CertificationsModule,
    SkillsModule,
    ResumeSkillsModule,
    SavedJobsModule,
    InterviewsModule,
    NotificationsModule,
    AuditLogsModule,
    AdminModule,
    PasswordRecoveryModule,
],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
