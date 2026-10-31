import { BadRequestException } from '@nestjs/common';
import type { application_fields } from '@prisma/client';
import { FIELD_TYPE } from '../common/constants';
import type { ResponseValueDto } from './dto/create-application-responses.dto';

export interface ResponseColumns {
  response_text: string | null;
  response_number: number | null;
  response_date: Date | null;
  file_url: string | null;
}

/** Which input column a field type reads from. */
function columnFor(type: string): keyof ResponseValueDto {
  switch (type) {
    case FIELD_TYPE.NUMBER:
      return 'response_number';
    case FIELD_TYPE.DATE:
      return 'response_date';
    case FIELD_TYPE.FILE:
      return 'file_url';
    default:
      return 'response_text';
  }
}

export function hasValue(field: Pick<application_fields, 'field_type'>, input: ResponseValueDto): boolean {
  const value = input[columnFor(field.field_type)];
  return value !== undefined && value !== null && String(value).trim() !== '';
}

function optionsOf(field: application_fields): string[] {
  return Array.isArray(field.field_options) ? (field.field_options as string[]) : [];
}

/**
 * Validate an answer against its field and map it to the table's columns.
 * Throws a 400 with a message naming the field when the answer is unusable.
 */
export function toResponseColumns(field: application_fields, input: ResponseValueDto): ResponseColumns {
  const label = `"${field.field_label}"`;
  const column = columnFor(field.field_type);

  if (!hasValue(field, input)) {
    throw new BadRequestException(`An answer is required for ${label}.`);
  }

  // Reject answers placed in the wrong column rather than silently dropping them.
  for (const other of ['response_text', 'response_number', 'response_date', 'file_url'] as const) {
    if (other !== column && input[other] !== undefined) {
      throw new BadRequestException(`${label} (${field.field_type}) must be answered with ${column}.`);
    }
  }

  const out: ResponseColumns = {
    response_text: null,
    response_number: null,
    response_date: null,
    file_url: null,
  };

  switch (field.field_type) {
    case FIELD_TYPE.NUMBER:
      out.response_number = input.response_number as number;
      break;
    case FIELD_TYPE.DATE:
      out.response_date = new Date(input.response_date as string);
      break;
    case FIELD_TYPE.FILE:
      out.file_url = input.file_url as string;
      break;
    case FIELD_TYPE.SELECT:
    case FIELD_TYPE.RADIO: {
      const text = input.response_text as string;
      if (!optionsOf(field).includes(text)) {
        throw new BadRequestException(`${label}: "${text}" is not one of the allowed options.`);
      }
      out.response_text = text;
      break;
    }
    case FIELD_TYPE.MULTISELECT: {
      let picked: unknown;
      try {
        picked = JSON.parse(input.response_text as string);
      } catch {
        picked = null;
      }
      const options = optionsOf(field);
      if (
        !Array.isArray(picked) ||
        picked.length === 0 ||
        !picked.every((item) => typeof item === 'string' && options.includes(item))
      ) {
        throw new BadRequestException(`${label} must be a JSON array of allowed options.`);
      }
      out.response_text = JSON.stringify(picked);
      break;
    }
    case FIELD_TYPE.CHECKBOX: {
      const text = input.response_text as string;
      if (text !== 'true' && text !== 'false') {
        throw new BadRequestException(`${label} must be "true" or "false".`);
      }
      if (field.is_required && text !== 'true') {
        throw new BadRequestException(`${label} must be accepted.`);
      }
      out.response_text = text;
      break;
    }
    default:
      out.response_text = input.response_text as string;
  }

  return out;
}
