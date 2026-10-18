import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  private readonly transporter: nodemailer.Transporter;

  constructor(private readonly configService: ConfigService) {
    const emailUser = this.configService.get<string>('EMAIL_USER');
    const emailPassword =
      this.configService.get<string>('EMAIL_APP_PASSWORD');

    if (!emailUser || !emailPassword) {
      throw new Error(
        'EMAIL_USER and EMAIL_APP_PASSWORD must be configured in .env',
      );
    }

    this.transporter = nodemailer.createTransport({
      host: this.configService.get<string>('EMAIL_HOST', 'smtp.gmail.com'),
      port: Number(this.configService.get<string>('EMAIL_PORT', '587')),
      secure: false,
      auth: {
        user: emailUser,
        pass: emailPassword,
      },
    });
  }

  async sendOtpEmail(
    recipient: string,
    otp: string,
    purpose: 'EMAIL_VERIFICATION' | 'PASSWORD_RESET' | 'PASSWORD_CHANGE',
  ): Promise<void> {
    const emailUser = this.configService.get<string>('EMAIL_USER');

    const subject =
      purpose === 'EMAIL_VERIFICATION'
        ? 'Verify your JOBI account'
        : purpose === 'PASSWORD_RESET'
          ? 'Reset your JOBI password'
          : 'Confirm your JOBI password change';

    const message =
      purpose === 'EMAIL_VERIFICATION'
        ? 'Use the code below to verify your email address. you nigga'
        : purpose === 'PASSWORD_RESET'
          ? 'Use the code below to verify your password reset request.'
          : 'Use the code below to confirm your password change.';

    try {
      await this.transporter.sendMail({
        from: `"JOBI" <${emailUser}>`,
        to: recipient,
        subject,
        text: `${message}\n\nYour verification code is: ${otp}\n\nThis code expires in 10 minutes. It can only be used once. Do not share it with anyone.`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 500px; margin: auto;">
            <h2>JOBI Account Security</h2>
            <p>${message}</p>
            <div style="font-size: 30px; font-weight: bold; letter-spacing: 8px; padding: 16px 0;">
              ${otp}
            </div>
            <p>This code expires in 10 minutes and can only be used once.</p>
            <p>If you did not request this code, you can ignore this email.</p>
          </div>
        `,
      });

      this.logger.log(`OTP email sent successfully to ${recipient}`);
    } catch (error) {
      this.logger.error('Failed to send OTP email');

      throw new InternalServerErrorException(
        'Unable to send the verification email. Please try again later.',
      );
    }
  }
}