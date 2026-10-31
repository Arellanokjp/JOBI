import { BadRequestException } from '@nestjs/common';

/** Throws 400 when both dates exist and the end is before the start. */
export function assertDateOrder(
  start: Date | string | null | undefined,
  end: Date | string | null | undefined,
  startName: string,
  endName: string,
) {
  if (start && end && new Date(end).getTime() < new Date(start).getTime()) {
    throw new BadRequestException(`${endName} cannot be before ${startName}.`);
  }
}

export const toDate = (value: string | undefined): Date | undefined =>
  value === undefined ? undefined : new Date(value);
