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

    const host = this.configService.get<string>(
      'EMAIL_HOST',
      'smtp.gmail.com',
    );

    const port = Number(
      this.configService.get<string>('EMAIL_PORT', '465'),
    );

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: {
        user: emailUser,
        pass: emailPassword,
      },
      connectionTimeout: 15000,
      greetingTimeout: 15000,
      socketTimeout: 20000,
    });

    this.logger.log(`Email service configured for SMTP host: ${host}`);
  }

  async sendOtpEmail(
    recipient: string,
    otp: string,
    purpose:
      | 'EMAIL_VERIFICATION'
      | 'PASSWORD_RESET'
      | 'PASSWORD_CHANGE',
  ): Promise<void> {
    const emailUser = this.configService.get<string>('EMAIL_USER');

    if (!emailUser) {
      throw new InternalServerErrorException(
        'Email sender is not configured.',
      );
    }

    const subject =
      purpose === 'EMAIL_VERIFICATION'
        ? 'Verify your JOBI account'
        : purpose === 'PASSWORD_RESET'
          ? 'Reset your JOBI password'
          : 'Confirm your JOBI password change';

    const message =
      purpose === 'EMAIL_VERIFICATION'
        ? 'Use the code below to verify your email address.'
        : purpose === 'PASSWORD_RESET'
          ? 'Use the code below to verify your password reset request.'
          : 'Use the code below to confirm your password change.';

    try {
      await this.transporter.sendMail({
        from: `"JOBI" <${emailUser}>`,
        to: recipient,
        subject,
        text: [
          message,
          '',
          `Your verification code is: ${otp}`,
          '',
          'This code expires in 10 minutes and can only be used once.',
          'Do not share it with anyone.',
          '',
          'If you did not request this code, you can ignore this email.',
        ].join('\n'),
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 500px; margin: auto; color: #333;">
            <h2 style="color: #2A7C13;">JOBI Account Security</h2>

            <p>${message}</p>

            <div style="font-size: 30px; font-weight: bold; letter-spacing: 8px; padding: 16px 0;">
              ${otp}
            </div>

            <p>This code expires in 10 minutes and can only be used once.</p>

            <p>For your security, do not share this code with anyone.</p>

            <p>If you did not request this code, you can ignore this email.</p>

            <hr />

            <p style="font-size: 12px; color: #777;">
              JOBI Account Security
            </p>
          </div>
        `,
      });

      this.logger.log(`OTP email sent successfully to ${recipient}`);
    } catch (error: unknown) {
      const err = error as {
        message?: string;
        code?: string;
        response?: string;
        responseCode?: number;
        command?: string;
      };

      // Never log SMTP passwords or the OTP itself.
      this.logger.error(
        `Failed to send OTP email. Error: ${err.message ?? 'Unknown error'}`,
      );

      this.logger.error(
        `SMTP diagnostic: ${JSON.stringify({
          code: err.code,
          response: err.response,
          responseCode: err.responseCode,
          command: err.command,
        })}`,
      );

      throw new InternalServerErrorException(
        'Unable to send the verification email. Please check the server logs.',
      );
    }
  }
}