import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

export class PaginationQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}

export function pageArgs(q: PaginationQueryDto, defaultLimit = 50) {
  const limit = q.limit ?? defaultLimit;
  const page = q.page ?? 1;
  return { take: limit, skip: (page - 1) * limit };
}
