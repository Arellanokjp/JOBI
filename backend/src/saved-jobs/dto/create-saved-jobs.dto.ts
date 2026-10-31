import { IsUUID } from 'class-validator';

export class CreateSavedJobDto {
  @IsUUID()
  job_id: string;
}
