import {
  Controller,
  Post,
  Body,
  UseGuards,
  Req,
  ForbiddenException,
} from '@nestjs/common';
import { Request } from 'express';
import { EmailService } from './email.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

interface AuthenticatedRequest extends Request {
  user: {
    id: string;
    role: string;
  };
}

@Controller('email')
export class EmailController {
  constructor(private readonly emailService: EmailService) {}

  @Post('test')
  @UseGuards(JwtAuthGuard)
  async testEmail(
    @Req() req: AuthenticatedRequest,
    @Body() body: { recipient: string },
  ) {
    if (req.user.role !== 'ADMIN') {
      throw new ForbiddenException('Only administrators can test email.');
    }

    if (
      typeof body.recipient !== 'string' ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.recipient)
    ) {
      throw new ForbiddenException('Provide a valid recipient email address.');
    }

    await this.emailService.sendOtpEmail(
      body.recipient,
      '758587',
      'EMAIL_VERIFICATION',
    );

    return {
      message: 'Test email sent successfully.',
      recipient: body.recipient,
    };
  }
}