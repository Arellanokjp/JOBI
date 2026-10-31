import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';

import { PrismaService } from '../prisma/prisma.service';
import type { AuthUser } from '../common/auth-user';
import { APPLICATION_STATUS } from '../common/constants';
import { CreateApplicationResponseDto } from './dto/create-application-responses.dto';
import { UpdateApplicationResponseDto } from './dto/update-application-responses.dto';
import { toResponseColumns } from './response-value.util';

@Injectable()
export class ApplicationResponsesService {
  constructor(private readonly prisma: PrismaService) {}

  /** Job seekers: answers on their own applications. Employers: on applications to their jobs. */
  private visibleWhere(user: AuthUser): Prisma.application_responsesWhereInput {
    switch (user.role) {
      case 'ADMIN':
        return {};
      case 'EMPLOYER':
        return { applications: { jobs: { companies: { owner_user_id: user.id } } } };
      default:
        return { applications: { applicant_user_id: user.id } };
    }
  }

  findAll(user: AuthUser, applicationId?: string) {
    return this.prisma.application_responses.findMany({
      where: { ...this.visibleWhere(user), ...(applicationId ? { application_id: applicationId } : {}) },
      include: { application_fields: true },
      orderBy: [{ application_id: 'asc' }, { application_fields: { display_order: 'asc' } }],
    });
  }

  async findOne(id: string, user: AuthUser) {
    const response = await this.prisma.application_responses.findFirst({
      where: { id, ...this.visibleWhere(user) },
      include: { application_fields: true },
    });
    if (!response) throw new NotFoundException('Response not found.');
    return response;
  }

  /** Answers may only be added or changed while the application is still SUBMITTED. */
  private assertEditable(status: string) {
    if (status !== APPLICATION_STATUS.SUBMITTED) {
      throw new ConflictException('Responses can only be changed while the application is SUBMITTED.');
    }
  }

  async create(dto: CreateApplicationResponseDto, user: AuthUser) {
    const application = await this.prisma.applications.findFirst({
      where: { id: dto.application_id, applicant_user_id: user.id },
      select: { id: true, status: true, jobs: { select: { application_forms: { select: { id: true } } } } },
    });
    if (!application) throw new NotFoundException('Application not found.');
    this.assertEditable(application.status);

    const formId = application.jobs.application_forms?.id;
    const field = formId
      ? await this.prisma.application_fields.findFirst({
          where: { id: dto.application_field_id, application_form_id: formId },
        })
      : null;
    if (!field) {
      throw new BadRequestException('application_field_id does not belong to this job\'s application form.');
    }

    const existing = await this.prisma.application_responses.findUnique({
      where: {
        application_id_application_field_id: {
          application_id: dto.application_id,
          application_field_id: dto.application_field_id,
        },
      },
      select: { id: true },
    });
    if (existing) throw new ConflictException('This field has already been answered; update the existing response.');

    return this.prisma.application_responses.create({
      data: {
        id: randomUUID(),
        application_id: dto.application_id,
        application_field_id: dto.application_field_id,
        ...toResponseColumns(field, dto),
      },
    });
  }

  async update(id: string, dto: UpdateApplicationResponseDto, user: AuthUser) {
    const response = await this.prisma.application_responses.findFirst({
      where: { id, applications: { applicant_user_id: user.id } },
      include: { applications: { select: { status: true } }, application_fields: true },
    });
    if (!response) throw new NotFoundException('Response not found.');
    this.assertEditable(response.applications.status);

    return this.prisma.application_responses.update({
      where: { id },
      data: toResponseColumns(response.application_fields, dto),
    });
  }

  async remove(id: string, user: AuthUser) {
    const response = await this.prisma.application_responses.findFirst({
      where: { id, applications: { applicant_user_id: user.id } },
      include: { applications: { select: { status: true } }, application_fields: true },
    });
    if (!response) throw new NotFoundException('Response not found.');
    this.assertEditable(response.applications.status);

    if (response.application_fields.is_required) {
      throw new BadRequestException('A required field\'s answer cannot be removed; update it instead.');
    }
    return this.prisma.application_responses.delete({ where: { id } });
  }
}
