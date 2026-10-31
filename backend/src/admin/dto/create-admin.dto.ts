import {
  IsBoolean, IsEmail, IsIn, IsNotEmpty, IsOptional, IsString, MaxLength, MinLength,
} from 'class-validator';
import { ACCOUNT_STATUSES, ROLE_NAMES } from '../../common/constants';

export class AdminCreateUserDto {
  @IsString() @IsNotEmpty() @MaxLength(50)
  first_name: string;

  @IsString() @IsNotEmpty() @MaxLength(50)
  last_name: string;

  @IsEmail() @MaxLength(255)
  email: string;

  @IsString() @IsNotEmpty() @MaxLength(20)
  phone_number: string;

  @IsString() @MinLength(8) @MaxLength(128)
  password: string;

  @IsIn(ROLE_NAMES)
  role: (typeof ROLE_NAMES)[number];

  /** Defaults to ACTIVE with a verified email, since an admin vouches for the account. */
  @IsOptional() @IsIn(ACCOUNT_STATUSES)
  account_status?: string;

  @IsOptional() @IsBoolean()
  email_verified?: boolean;
}
