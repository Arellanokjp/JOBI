import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';

import { PrismaService } from '../prisma/prisma.service';
import { openJobWhere } from '../jobs/jobs.service';
import type { AuthUser } from '../common/auth-user';
import { FIELD_TYPE } from '../common/constants';
import { CreateApplicationFieldDto } from './dto/create-application-fields.dto';
import { UpdateApplicationFieldDto } from './dto/update-application-fields.dto';

const CHOICE_TYPES: string[] = [FIELD_TYPE.SELECT, FIELD_TYPE.RADIO, FIELD_TYPE.MULTISELECT];

@Injectable()
export class ApplicationFieldsService {
  constructor(private readonly prisma: PrismaService) {}

  private visibleWhere(user: AuthUser): Prisma.application_fieldsWhereInput {
    switch (user.role) {
      case 'ADMIN':
        return { application_forms: { jobs: { deleted_at: null } } };
      case 'EMPLOYER':
        return {
          application_forms: { jobs: { deleted_at: null, companies: { owner_user_id: user.id } } },
        };
      default:
        return { application_forms: { is_active: true, jobs: openJobWhere() } };
    }
  }

  findAll(user: AuthUser, formId?: string) {
    return this.prisma.application_fields.findMany({
      where: { ...this.visibleWhere(user), ...(formId ? { application_form_id: formId } : {}) },
      orderBy: [{ application_form_id: 'asc' }, { display_order: 'asc' }],
    });
  }

  async findOne(id: string, user: AuthUser) {
    const field = await this.prisma.application_fields.findFirst({
      where: { id, ...this.visibleWhere(user) },
    });
    if (!field) throw new NotFoundException('Application field not found.');
    return field;
  }

  /** Choice fields need options; other field types must not carry any. */
  private assertOptions(type: string, options: string[] | undefined | null) {
    if (CHOICE_TYPES.includes(type)) {
      if (!options || options.length === 0) {
        throw new BadRequestException(`field_options is required for ${type} fields.`);
      }
    } else if (options && options.length > 0) {
      throw new BadRequestException(`field_options is only allowed for ${CHOICE_TYPES.join(', ')} fields.`);
    }
  }

  async create(dto: CreateApplicationFieldDto, user: AuthUser) {
    // The form must belong to one of the caller's jobs.
    const form = await this.prisma.application_forms.findFirst({
      where: {
        id: dto.application_form_id,
        jobs: {
          deleted_at: null,
          ...(user.role === 'ADMIN' ? {} : { companies: { owner_user_id: user.id } }),
        },
      },
      select: { id: true },
    });
    if (!form) throw new NotFoundException('Application form not found.');

    this.assertOptions(dto.field_type, dto.field_options);

    const clash = await this.prisma.application_fields.findFirst({
      where: { application_form_id: dto.application_form_id, field_name: dto.field_name },
      select: { id: true },
    });
    if (clash) throw new ConflictException('A field with this field_name already exists on the form.');

    const { field_options, ...fields } = dto;
    return this.prisma.application_fields.create({
      data: { ...fields, id: randomUUID(), ...(field_options ? { field_options } : {}) },
    });
  }

  async update(id: string, dto: UpdateApplicationFieldDto, user: AuthUser) {
    const field = await this.findOne(id, user);

    // Changing the type of a field that already has answers would corrupt them.
    if (dto.field_type && dto.field_type !== field.field_type) {
      const answers = await this.prisma.application_responses.count({
        where: { application_field_id: id },
      });
      if (answers > 0) {
        throw new ConflictException('The type of a field that already has responses cannot be changed.');
      }
    }

    const nextType = dto.field_type ?? field.field_type;
    const nextOptions =
      dto.field_options !== undefined ? dto.field_options : (field.field_options as string[] | null);
    this.assertOptions(nextType, nextOptions);

    if (dto.field_name && dto.field_name !== field.field_name) {
      const clash = await this.prisma.application_fields.findFirst({
        where: {
          application_form_id: field.application_form_id,
          field_name: dto.field_name,
          id: { not: id },
        },
        select: { id: true },
      });
      if (clash) throw new ConflictException('A field with this field_name already exists on the form.');
    }

    const { field_options, ...fields } = dto;
    return this.prisma.application_fields.update({
      where: { id },
      data: { ...fields, ...(field_options !== undefined ? { field_options } : {}) },
    });
  }

  /** Hard delete; refused once applicants have answered the field. */
  async remove(id: string, user: AuthUser) {
    await this.findOne(id, user);

    const answers = await this.prisma.application_responses.count({
      where: { application_field_id: id },
    });
    if (answers > 0) {
      throw new ConflictException('This field already has responses and cannot be deleted.');
    }
    return this.prisma.application_fields.delete({ where: { id } });
  }
}
