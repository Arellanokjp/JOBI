import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';

import { PrismaService } from '../prisma/prisma.service';
import { OtpService } from './otp.service';
import { accessTokenLifetime } from './token-lifetime';
import { ACCOUNT_STATUS, OTP_PURPOSE } from '../common/constants';

import { RegisterJobSeekerDto } from './dto/register-job-seeker.dto';
import { RegisterEmployerDto } from './dto/register-employer.dto';
import { LoginDto } from './dto/login.dto';
import { VerifyEmailOtpDto } from './dto/verify-email-otp.dto';
import { ResendEmailOtpDto } from './dto/resend-email-otp.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly otpService: OtpService,
  ) {}

  // Look up a role by its unique name.
  private async findRoleId(roleName: 'JOB_SEEKER' | 'EMPLOYER'): Promise<string> {
    const role = await this.prisma.roles.findUnique({
      where: { name: roleName },
      select: { id: true },
    });

    if (!role) {
      throw new BadRequestException(
        `The ${roleName} role was not found in the database. Run "npm run db:seed".`,
      );
    }

    return role.id;
  }

  // Shared registration logic.
  private async registerUser(
    dto: RegisterJobSeekerDto | RegisterEmployerDto,
    roleName: 'JOB_SEEKER' | 'EMPLOYER',
  ) {
    const { first_name, last_name, email, phone_number, password } = dto;

    const roleId = await this.findRoleId(roleName);
    const passwordHash = await bcrypt.hash(password, 12);
    const normalizedEmail = email.trim().toLowerCase();

    let user;
    try {
      // New accounts start unverified and pending.
      user = await this.prisma.users.create({
        data: {
          id: randomUUID(),
          role_id: roleId,
          first_name: first_name.trim(),
          last_name: last_name.trim(),
          email: normalizedEmail,
          phone_number: phone_number.trim(),
          password_hash: passwordHash,
          email_verified: false,
          account_status: ACCOUNT_STATUS.PENDING,
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
    } catch (error) {
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

    await this.otpService.issue(user.id, user.email, OTP_PURPOSE.EMAIL_VERIFICATION);

    return {
      message:
        roleName === 'EMPLOYER'
          ? 'Employer account created. Verify your email, then log in to create your company profile. Your company must be approved by an administrator before you can publish jobs.'
          : 'Job seeker account created. Check your email to verify your address before logging in.',
      user,
    };
  }

  registerJobSeeker(dto: RegisterJobSeekerDto) {
    return this.registerUser(dto, 'JOB_SEEKER');
  }

  registerEmployer(dto: RegisterEmployerDto) {
    return this.registerUser(dto, 'EMPLOYER');
  }

  // Verify an email using its OTP.
  async verifyEmailOtp(dto: VerifyEmailOtpDto) {
    const email = dto.email.trim().toLowerCase();

    const user = await this.prisma.users.findFirst({
      where: { email, deleted_at: null },
    });

    if (!user) {
      throw new BadRequestException('Invalid or expired verification code.');
    }

    if (user.email_verified) {
      return { message: 'Your email address is already verified.' };
    }

    const otpId = await this.otpService.verify(
      user.id,
      OTP_PURPOSE.EMAIL_VERIFICATION,
      dto.otp,
    );

    // Consume the OTP and verify the account in one transaction.
    await this.prisma.$transaction(async (tx) => {
      await this.otpService.consume(tx, otpId, user.id, OTP_PURPOSE.EMAIL_VERIFICATION);

      await tx.users.update({
        where: { id: user.id },
        data: {
          email_verified: true,
          // Only PENDING accounts are activated; suspended/inactive accounts
          // must never be re-activated by verifying an email.
          ...(user.account_status === ACCOUNT_STATUS.PENDING
            ? { account_status: ACCOUNT_STATUS.ACTIVE }
            : {}),
        },
      });
    });

    return {
      message:
        user.account_status === ACCOUNT_STATUS.PENDING
          ? 'Email verified successfully. You can now log in.'
          : 'Email verified successfully. Your account is not active, so you cannot log in yet; please contact JOBI support.',
    };
  }

  // Resend an email-verification OTP.
  async resendEmailOtp(dto: ResendEmailOtpDto) {
    const email = dto.email.trim().toLowerCase();

    const user = await this.prisma.users.findFirst({
      where: { email, deleted_at: null },
    });

    // Avoid revealing whether an email is registered.
    if (!user || user.email_verified) {
      return {
        message:
          'If the account exists and requires verification, a new code will be sent when permitted.',
      };
    }

    await this.otpService.assertCanSend(user.id, OTP_PURPOSE.EMAIL_VERIFICATION);
    await this.otpService.issue(user.id, user.email, OTP_PURPOSE.EMAIL_VERIFICATION);

    return { message: 'A new verification code has been sent. Check your email.' };
  }

  // Log in using email and password.
  async login(dto: LoginDto) {
    const email = dto.email.trim().toLowerCase();

    const user = await this.prisma.users.findFirst({
      where: { email, deleted_at: null },
      include: { roles: { select: { name: true } } },
    });

    if (!user || !user.password_hash) {
      throw new UnauthorizedException('Invalid email or password.');
    }

    const passwordMatches = await bcrypt.compare(dto.password, user.password_hash);

    if (!passwordMatches) {
      throw new UnauthorizedException('Invalid email or password.');
    }

    if (!user.email_verified) {
      throw new UnauthorizedException('Please verify your email before logging in.');
    }

    if (user.account_status !== ACCOUNT_STATUS.ACTIVE) {
      throw new UnauthorizedException(
        'Your account is not active. Please contact JOBI support if you need assistance.',
      );
    }

    const role = user.roles.name.toUpperCase();

    const accessToken = await this.jwtService.signAsync({
      sub: user.id,
      role,
    });


    await this.prisma.users.update({
      where: { id: user.id },
      data: { last_login_at: new Date() },
    });

    return {
      message: 'Login successful.',
      access_token: accessToken,
      token_type: 'Bearer',
      expires_in: accessTokenLifetime(),
      user: {
        id: user.id,
        first_name: user.first_name,
        last_name: user.last_name,
        email: user.email,
        phone_number: user.phone_number,
        email_verified: user.email_verified,
        account_status: user.account_status,
        role,
      },
    };
  }
}
