import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { randomInt, randomUUID } from 'crypto';

import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import type { OtpPurpose } from '../common/constants';

export type OtpSendBlock = 'COOLDOWN' | 'HOURLY_LIMIT' | null;

/** Shared one-time-password logic (email verification, password reset, ...). */
@Injectable()
export class OtpService {
  private readonly EXPIRY_MINUTES = 10;
  private readonly MAX_ATTEMPTS = 5;
  private readonly RESEND_COOLDOWN_SECONDS = 60;
  private readonly MAX_SENDS_PER_HOUR = 5;

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
  ) {}

  async issue(userId: string, email: string, purpose: OtpPurpose): Promise<void> {
    const otp = randomInt(100000, 1000000).toString();
    const otpHash = await bcrypt.hash(otp, 12);
    const now = new Date();
    const expiresAt = new Date(now.getTime() + this.EXPIRY_MINUTES * 60 * 1000);

    const otpRecord = await this.prisma.$transaction(async (tx) => {
      await tx.email_verification_otps.updateMany({
        where: { user_id: userId, purpose, used_at: null },
        data: { used_at: now },
      });

      return tx.email_verification_otps.create({
        data: {
          id: randomUUID(),
          user_id: userId,
          otp_hash: otpHash,
          purpose,
          expires_at: expiresAt,
        },
      });
    });

    try {
      await this.emailService.sendOtpEmail(email, otp, purpose);
    } catch {
      // Invalidate only the OTP whose delivery failed.
      await this.prisma.email_verification_otps.updateMany({
        where: { id: otpRecord.id, used_at: null },
        data: { used_at: new Date() },
      });

      throw new InternalServerErrorException(
        'Unable to send the verification email. Please try again later.',
      );
    }
  }

  /** Whether a new OTP may be sent now (60s cooldown, 5 per hour). */
  async sendBlock(userId: string, purpose: OtpPurpose): Promise<OtpSendBlock> {
    const now = new Date();

    const latest = await this.prisma.email_verification_otps.findFirst({
      where: { user_id: userId, purpose },
      orderBy: { created_at: 'desc' },
      select: { created_at: true },
    });

    if (
      latest &&
      (now.getTime() - latest.created_at.getTime()) / 1000 <
        this.RESEND_COOLDOWN_SECONDS
    ) {
      return 'COOLDOWN';
    }

    const recent = await this.prisma.email_verification_otps.count({
      where: {
        user_id: userId,
        purpose,
        created_at: { gte: new Date(now.getTime() - 60 * 60 * 1000) },
      },
    });

    return recent >= this.MAX_SENDS_PER_HOUR ? 'HOURLY_LIMIT' : null;
  }

  /** Throwing variant of sendBlock for endpoints that may reveal rate limits. */
  async assertCanSend(userId: string, purpose: OtpPurpose): Promise<void> {
    const block = await this.sendBlock(userId, purpose);
    if (block === 'COOLDOWN') {
      throw new HttpException(
        'Please wait before requesting another verification code.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    if (block === 'HOURLY_LIMIT') {
      throw new HttpException(
        'You have requested too many verification codes. Please try again later.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }

  /**
   * Check a submitted OTP against the latest valid one. Wrong guesses are
   * counted and lock the code after 5 attempts. Returns the OTP record id;
   * call consume() inside your transaction to actually spend it.
   */
  async verify(userId: string, purpose: OtpPurpose, otp: string): Promise<string> {
    const record = await this.prisma.email_verification_otps.findFirst({
      where: {
        user_id: userId,
        purpose,
        used_at: null,
        expires_at: { gt: new Date() },
      },
      orderBy: { created_at: 'desc' },
    });

    if (!record) {
      throw new BadRequestException(
        'Invalid or expired verification code. Request a new code.',
      );
    }

    if (record.attempts >= this.MAX_ATTEMPTS) {
      throw new HttpException(
        'Too many incorrect attempts. Request a new verification code.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    if (await bcrypt.compare(otp, record.otp_hash)) {
      return record.id;
    }

    const bumped = await this.prisma.email_verification_otps.updateMany({
      where: {
        id: record.id,
        used_at: null,
        expires_at: { gt: new Date() },
        attempts: { lt: this.MAX_ATTEMPTS },
      },
      data: { attempts: { increment: 1 } },
    });

    if (bumped.count === 0) {
      throw new BadRequestException(
        'Invalid or expired verification code. Request a new code.',
      );
    }

    if (record.attempts + 1 >= this.MAX_ATTEMPTS) {
      throw new HttpException(
        'Too many incorrect attempts. Request a new verification code.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    throw new BadRequestException('Incorrect verification code.');
  }

  /** Atomically mark an OTP as used inside an existing transaction. */
  async consume(
    tx: Prisma.TransactionClient,
    otpId: string,
    userId: string,
    purpose: OtpPurpose,
  ): Promise<void> {
    const result = await tx.email_verification_otps.updateMany({
      where: {
        id: otpId,
        user_id: userId,
        purpose,
        used_at: null,
        expires_at: { gt: new Date() },
        attempts: { lt: this.MAX_ATTEMPTS },
      },
      data: { used_at: new Date() },
    });

    if (result.count !== 1) {
      throw new BadRequestException(
        'This verification code is invalid, expired, or already used. Request a new code.',
      );
    }
  }
}
