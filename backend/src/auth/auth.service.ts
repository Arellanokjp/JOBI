import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  BadRequestException,
  InternalServerErrorException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';

import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';

import { RegisterJobSeekerDto } from './dto/register-job-seeker.dto';
import { RegisterEmployerDto } from './dto/register-employer.dto';
import { LoginDto } from './dto/login.dto';
import { VerifyEmailOtpDto } from './dto/verify-email-otp.dto';
import { ResendEmailOtpDto } from './dto/resend-email-otp.dto';

import * as bcrypt from 'bcrypt';
import { randomUUID, randomInt } from 'crypto';

@Injectable()
export class AuthService {
  private readonly OTP_EXPIRY_MINUTES = 10;
  private readonly OTP_MAX_ATTEMPTS = 5;
  private readonly OTP_RESEND_COOLDOWN_SECONDS = 60;
  private readonly OTP_MAX_SENDS_PER_HOUR = 5;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly emailService: EmailService,
  ) {}

  // Find a role by its name.
  private async findRoleId(roleName: string): Promise<string> {
    const roles = await this.prisma.roles.findMany();

    const matchingRole = roles.find((role) =>
      Object.values(role).some(
        (value) =>
          typeof value === 'string' &&
          value.toUpperCase() === roleName,
      ),
    );

    if (!matchingRole) {
      throw new BadRequestException(
        `The ${roleName} role was not found in the database.`,
      );
    }

    const roleId = Object.values(matchingRole).find(
      (value) =>
        typeof value === 'string' &&
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          value,
        ),
    );

    if (typeof roleId !== 'string') {
      throw new InternalServerErrorException(
        `Could not determine the ${roleName} role ID.`,
      );
    }

    return roleId;
  }

  // Generate, hash, store, and email an OTP.
  private async createAndSendOtp(
    userId: string,
    email: string,
    purpose:
      | 'EMAIL_VERIFICATION'
      | 'PASSWORD_RESET'
      | 'PASSWORD_CHANGE',
  ): Promise<void> {
    const otp = randomInt(100000, 1000000).toString();
    const otpHash = await bcrypt.hash(otp, 12);
    const now = new Date();

    const expiresAt = new Date(
      now.getTime() + this.OTP_EXPIRY_MINUTES * 60 * 1000,
    );

    // Invalidate previous unused OTPs and create the new OTP.
    const otpRecord = await this.prisma.$transaction(
      async (tx) => {
        await tx.email_verification_otps.updateMany({
          where: {
            user_id: userId,
            purpose,
            used_at: null,
          },
          data: {
            used_at: now,
          },
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
      },
    );

    try {
      await this.emailService.sendOtpEmail(
        email,
        otp,
        purpose,
      );
    } catch {
      // Invalidate only the OTP whose delivery failed.
      await this.prisma.email_verification_otps.updateMany({
        where: {
          id: otpRecord.id,
          used_at: null,
        },
        data: {
          used_at: new Date(),
        },
      });

      throw new InternalServerErrorException(
        'Unable to send the verification email. Please try again later.',
      );
    }
  }

  // Shared registration logic.
  private async registerUser(
    dto: RegisterJobSeekerDto | RegisterEmployerDto,
    roleName: 'JOB_SEEKER' | 'EMPLOYER',
  ) {
    const {
      first_name,
      last_name,
      email,
      phone_number,
      password,
    } = dto;

    try {
      const roleId = await this.findRoleId(roleName);

      const passwordHash = await bcrypt.hash(password, 12);
      const normalizedEmail = email.trim().toLowerCase();

      // New accounts remain unverified and pending.
      const user = await this.prisma.users.create({
        data: {
          id: randomUUID(),
          role_id: roleId,
          first_name,
          last_name,
          email: normalizedEmail,
          phone_number,
          password_hash: passwordHash,
          email_verified: false,
          account_status: 'PENDING',
        },
        select: {
          id: true,
          first_name: true,
          last_name: true,
          email: true,
          phone_number: true,
          email_verified: true,
          account_status: true,
          created_at: true,
          updated_at: true,
        },
      });

      await this.createAndSendOtp(
        user.id,
        user.email,
        'EMAIL_VERIFICATION',
      );

      return {
        message:
          roleName === 'EMPLOYER'
            ? 'Employer account created. Check your email to verify your address. Company verification and administrator approval are also required.'
            : 'Job seeker account created. Check your email to verify your address before logging in.',
        user,
      };
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof InternalServerErrorException
      ) {
        throw error;
      }

      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'The email address or phone number is already registered.',
        );
      }

      throw error;
    }
  }

  // Register a job seeker.
  async registerJobSeeker(dto: RegisterJobSeekerDto) {
    return this.registerUser(dto, 'JOB_SEEKER');
  }

  // Register an employer.
  async registerEmployer(dto: RegisterEmployerDto) {
    return this.registerUser(dto, 'EMPLOYER');
  }

  // Verify an email using its OTP.
  async verifyEmailOtp(dto: VerifyEmailOtpDto) {
    const email = dto.email.trim().toLowerCase();

    const user = await this.prisma.users.findFirst({
      where: {
        email,
        deleted_at: null,
      },
    });

    if (!user) {
      throw new BadRequestException(
        'Invalid or expired verification code.',
      );
    }

    if (user.email_verified) {
      return {
        message: 'Your email address is already verified.',
      };
    }

    const now = new Date();

    const otpRecord =
      await this.prisma.email_verification_otps.findFirst({
        where: {
          user_id: user.id,
          purpose: 'EMAIL_VERIFICATION',
          used_at: null,
          expires_at: {
            gt: now,
          },
        },
        orderBy: {
          created_at: 'desc',
        },
      });

    if (!otpRecord) {
      throw new BadRequestException(
        'Invalid or expired verification code. Request a new code.',
      );
    }

    if (otpRecord.attempts >= this.OTP_MAX_ATTEMPTS) {
      throw new HttpException(
        'Too many incorrect attempts. Request a new verification code.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const otpMatches = await bcrypt.compare(
      dto.otp,
      otpRecord.otp_hash,
    );

    if (!otpMatches) {
      const attemptUpdate =
        await this.prisma.email_verification_otps.updateMany({
          where: {
            id: otpRecord.id,
            used_at: null,
            expires_at: {
              gt: new Date(),
            },
            attempts: {
              lt: this.OTP_MAX_ATTEMPTS,
            },
          },
          data: {
            attempts: {
              increment: 1,
            },
          },
        });

      if (attemptUpdate.count === 0) {
        throw new BadRequestException(
          'Invalid or expired verification code. Request a new code.',
        );
      }

      const updatedOtp =
        await this.prisma.email_verification_otps.findUnique({
          where: {
            id: otpRecord.id,
          },
          select: {
            attempts: true,
          },
        });

      if (
        updatedOtp &&
        updatedOtp.attempts >= this.OTP_MAX_ATTEMPTS
      ) {
        throw new HttpException(
          'Too many incorrect attempts. Request a new verification code.',
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }

      throw new BadRequestException(
        'Incorrect verification code.',
      );
    }

    // Consume the OTP and verify the account in one transaction.
    await this.prisma.$transaction(async (tx) => {
      const consumeResult =
        await tx.email_verification_otps.updateMany({
          where: {
            id: otpRecord.id,
            user_id: user.id,
            purpose: 'EMAIL_VERIFICATION',
            used_at: null,
            expires_at: {
              gt: new Date(),
            },
            attempts: {
              lt: this.OTP_MAX_ATTEMPTS,
            },
          },
          data: {
            used_at: new Date(),
          },
        });

      if (consumeResult.count !== 1) {
        throw new BadRequestException(
          'This verification code is invalid, expired, or already used. Request a new code.',
        );
      }

      await tx.users.update({
        where: {
          id: user.id,
        },
        data: {
          email_verified: true,
          account_status: 'ACTIVE'
        },
      });
    });

    // Email verification does not activate pending accounts.
    // Employer company approval remains a separate process.
    return {
      message:
        'Email verified successfully. Your account must also be active before you can log in.',
    };
  }

  // Resend an email-verification OTP.
  async resendEmailOtp(dto: ResendEmailOtpDto) {
    const email = dto.email.trim().toLowerCase();

    const user = await this.prisma.users.findFirst({
      where: {
        email,
        deleted_at: null,
      },
    });

    // Avoid revealing whether an email is registered.
    if (!user || user.email_verified) {
      return {
        message:
          'If the account exists and requires verification, a new code will be sent when permitted.',
      };
    }

    const now = new Date();

    const latestOtp =
      await this.prisma.email_verification_otps.findFirst({
        where: {
          user_id: user.id,
          purpose: 'EMAIL_VERIFICATION',
        },
        orderBy: {
          created_at: 'desc',
        },
        select: {
          created_at: true,
        },
      });

    // Enforce a 60-second resend cooldown.
    if (latestOtp) {
      const elapsedSeconds =
        (now.getTime() - latestOtp.created_at.getTime()) / 1000;

      if (
        elapsedSeconds <
        this.OTP_RESEND_COOLDOWN_SECONDS
      ) {
        throw new HttpException(
          'Please wait before requesting another verification code.',
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
    }

    // Limit OTP creation to five records per hour per user.
    const oneHourAgo = new Date(
      now.getTime() - 60 * 60 * 1000,
    );

    const recentOtpCount =
      await this.prisma.email_verification_otps.count({
        where: {
          user_id: user.id,
          purpose: 'EMAIL_VERIFICATION',
          created_at: {
            gte: oneHourAgo,
          },
        },
      });

    if (recentOtpCount >= this.OTP_MAX_SENDS_PER_HOUR) {
      throw new HttpException(
        'You have requested too many verification codes. Please try again later.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    await this.createAndSendOtp(
      user.id,
      user.email,
      'EMAIL_VERIFICATION',
    );

    return {
      message:
        'A new verification code has been sent. Check your email.',
    };
  }

  // Log in using email and password.
  async login(dto: LoginDto) {
    const email = dto.email.trim().toLowerCase();

    const user = await this.prisma.users.findFirst({
      where: {
        email,
        deleted_at: null,
      },
    });

    if (!user || !user.password_hash) {
      throw new UnauthorizedException(
        'Invalid email or password.',
      );
    }

    const passwordMatches = await bcrypt.compare(
      dto.password,
      user.password_hash,
    );

    if (!passwordMatches) {
      throw new UnauthorizedException(
        'Invalid email or password.',
      );
    }

    // Unverified accounts cannot log in.
    if (!user.email_verified) {
      throw new UnauthorizedException(
        'Please verify your email before logging in.',
      );
    }

    // Only active accounts can log in.
    if (user.account_status !== 'ACTIVE') {
      throw new UnauthorizedException(
        'Your account is not active. Please contact JOBI support if you need assistance.',
      );
    }

    const roles = await this.prisma.roles.findMany();

    const userRole = roles.find((role) =>
      Object.values(role).some(
        (value) =>
          typeof value === 'string' &&
          value === user.role_id,
      ),
    );

    const roleName = userRole
      ? Object.values(userRole).find(
          (value) =>
            typeof value === 'string' &&
            ['ADMIN', 'EMPLOYER', 'JOB_SEEKER'].includes(
              value.toUpperCase(),
            ),
        )
      : undefined;

    if (typeof roleName !== 'string') {
      throw new InternalServerErrorException(
        'The account role could not be resolved.',
      );
    }

    const accessToken = await this.jwtService.signAsync({
      sub: user.id,
      role: roleName.toUpperCase(),
    });

    return {
      message: 'Login successful.',
      access_token: accessToken,
      token_type: 'Bearer',
      expires_in: process.env.JWT_EXPIRES_IN || '1h',
      user: {
        id: user.id,
        first_name: user.first_name,
        last_name: user.last_name,
        email: user.email,
        phone_number: user.phone_number,
        email_verified: user.email_verified,
        account_status: user.account_status,
        role: roleName.toUpperCase(),
      },
    };
  }
}