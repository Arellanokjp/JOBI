import { Global, Injectable, Module, ForbiddenException, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { VERIFICATION_STATUS } from './constants';

/** Reusable ownership lookups shared by several modules. */
@Injectable()
export class AccessService {
  constructor(private readonly prisma: PrismaService) {}

  /** The employer's own (non-deleted) company, or a 403 telling them to create one. */
  async getOwnCompany(userId: string) {
    const company = await this.prisma.companies.findFirst({
      where: { owner_user_id: userId, deleted_at: null },
    });
    if (!company) {
      throw new ForbiddenException('Create your company profile before using this feature.');
    }
    return company;
  }

  /** Same as getOwnCompany but also requires the company to be approved by an admin. */
  async getApprovedCompany(userId: string) {
    const company = await this.getOwnCompany(userId);
    if (company.verification_status !== VERIFICATION_STATUS.APPROVED) {
      throw new ForbiddenException(
        'Your company must be approved by an administrator before you can publish jobs.',
      );
    }
    return company;
  }

  /** The job seeker's own (non-deleted) resume. */
  async getOwnResume(userId: string) {
    const resume = await this.prisma.resumes.findFirst({
      where: { user_id: userId, deleted_at: null },
    });
    if (!resume) {
      throw new NotFoundException('Create your resume first.');
    }
    return resume;
  }

  /**
   * An employer may see a resume only when the candidate attached it to an
   * application for one of the employer's jobs (and has not withdrawn it).
   */
  resumesVisibleToEmployer(employerUserId: string): Prisma.resumesWhereInput {
    return {
      deleted_at: null,
      applications: {
        some: {
          status: { not: 'WITHDRAWN' },
          jobs: { companies: { owner_user_id: employerUserId } },
        },
      },
    };
  }
}

@Global()
@Module({
  providers: [AccessService],
  exports: [AccessService],
})
export class CommonModule {}
