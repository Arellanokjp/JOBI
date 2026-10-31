import { IsNotEmpty, IsString, IsUUID, MaxLength } from 'class-validator';

/** Admins can send a notification to any user. */
export class CreateNotificationDto {
  @IsUUID()
  user_id: string;

  @IsString() @IsNotEmpty() @MaxLength(255)
  title: string;

  @IsString() @IsNotEmpty() @MaxLength(10000)
  message: string;

  @IsString() @IsNotEmpty() @MaxLength(50)
  notification_type: string;
}
