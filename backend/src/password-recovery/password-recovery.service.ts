import { BadRequestException, Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

import { PrismaService } from '../prisma/prisma.service';
import { OtpService } from '../auth/otp.service';
import { OTP_PURPOSE } from '../common/constants';
import { RequestPasswordResetDto } from './dto/request-password-reset.dto';
import { ConfirmPasswordResetDto } from './dto/confirm-password-reset.dto';

@Injectable()
export class PasswordRecoveryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly otpService: OtpService,
  ) {}

  /**
   * Always answers the same way so the endpoint cannot be used to discover
   * which email addresses are registered (including when throttled).
   */
  async requestReset(dto: RequestPasswordResetDto) {
    const email = dto.email.trim().toLowerCase();

    const user = await this.prisma.users.findFirst({
      where: { email, deleted_at: null, email_verified: true },
      select: { id: true, email: true },
    });

    if (
      user &&
      (await this.otpService.sendBlock(user.id, OTP_PURPOSE.PASSWORD_RESET)) === null
    ) {
      await this.otpService.issue(user.id, user.email, OTP_PURPOSE.PASSWORD_RESET);
    }

    return {
      message:
        'If an account with that email exists, a password reset code has been sent.',
    };
  }

  async confirmReset(dto: ConfirmPasswordResetDto) {
    const email = dto.email.trim().toLowerCase();

    const user = await this.prisma.users.findFirst({
      where: { email, deleted_at: null, email_verified: true },
      select: { id: true },
    });

    if (!user) {
      throw new BadRequestException('Invalid or expired verification code.');
    }

    const otpId = await this.otpService.verify(
      user.id,
      OTP_PURPOSE.PASSWORD_RESET,
      dto.otp,
    );

    const passwordHash = await bcrypt.hash(dto.newPassword, 12);

    await this.prisma.$transaction(async (tx) => {
      await this.otpService.consume(tx, otpId, user.id, OTP_PURPOSE.PASSWORD_RESET);
      await tx.users.update({
        where: { id: user.id },
        data: { password_hash: passwordHash },
      });
    });

    return { message: 'Password updated. You can now log in with your new password.' };
  }
}
