import { Type } from 'class-transformer';
import { IsDate, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { PaginationQueryDto } from '../../common/pagination.dto';

export class ListAuditLogsQueryDto extends PaginationQueryDto {
  @IsOptional() @IsUUID()
  user_id?: string;

  @IsOptional() @IsString() @MaxLength(100)
  action?: string;

  @IsOptional() @IsString() @MaxLength(100)
  entity_type?: string;

  @IsOptional() @IsUUID()
  entity_id?: string;

  @IsOptional() @Type(() => Date) @IsDate()
  from?: Date;

  @IsOptional() @Type(() => Date) @IsDate()
  to?: Date;
}
