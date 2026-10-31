import { BadRequestException } from '@nestjs/common';
import type { application_fields } from '@prisma/client';
import { hasValue, toResponseColumns } from './response-value.util';

const field = (over: Partial<application_fields>): application_fields =>
  ({
    id: 'f1',
    field_label: 'Q',
    field_type: 'TEXT',
    is_required: false,
    field_options: null,
    ...over,
  }) as application_fields;

describe('toResponseColumns', () => {
  it('maps TEXT to response_text', () => {
    expect(toResponseColumns(field({}), { response_text: 'hi' }).response_text).toBe('hi');
  });

  it('maps NUMBER and DATE to their own columns', () => {
    expect(toResponseColumns(field({ field_type: 'NUMBER' }), { response_number: 4 }).response_number).toBe(4);
    const d = toResponseColumns(field({ field_type: 'DATE' }), { response_date: '2026-01-02' });
    expect(d.response_date).toBeInstanceOf(Date);
  });

  it('rejects an answer in the wrong column', () => {
    expect(() => toResponseColumns(field({ field_type: 'NUMBER' }), { response_text: '4' })).toThrow(
      BadRequestException,
    );
  });

  it('only accepts SELECT answers from the options', () => {
    const f = field({ field_type: 'SELECT', field_options: ['a', 'b'] });
    expect(toResponseColumns(f, { response_text: 'a' }).response_text).toBe('a');
    expect(() => toResponseColumns(f, { response_text: 'z' })).toThrow(BadRequestException);
  });

  it('validates MULTISELECT as a JSON array of options', () => {
    const f = field({ field_type: 'MULTISELECT', field_options: ['a', 'b'] });
    expect(toResponseColumns(f, { response_text: '["a","b"]' }).response_text).toBe('["a","b"]');
    expect(() => toResponseColumns(f, { response_text: '["a","x"]' })).toThrow(BadRequestException);
    expect(() => toResponseColumns(f, { response_text: 'a' })).toThrow(BadRequestException);
  });

  it('requires a required CHECKBOX to be accepted', () => {
    const f = field({ field_type: 'CHECKBOX', is_required: true });
    expect(() => toResponseColumns(f, { response_text: 'false' })).toThrow(BadRequestException);
    expect(toResponseColumns(f, { response_text: 'true' }).response_text).toBe('true');
  });

  it('hasValue treats blank strings as empty', () => {
    expect(hasValue(field({}), { response_text: '   ' })).toBe(false);
    expect(hasValue(field({ field_type: 'NUMBER' }), { response_number: 0 })).toBe(true);
  });
});
