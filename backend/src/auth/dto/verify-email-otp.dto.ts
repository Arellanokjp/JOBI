import {
  IsEmail,
  IsString,
  Length,
  Matches,
} from 'class-validator';

export class VerifyEmailOtpDto {
  @IsEmail()
  email: string;

  @IsString()
  @Length(6, 6, {
    message: 'OTP must contain exactly 6 digits.',
  })
  @Matches(/^\d{6}$/, {
    message: 'OTP must contain only digits.',
  })
  otp: string;
}