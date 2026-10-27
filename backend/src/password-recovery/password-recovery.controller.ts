import { Body, Controller, Post } from '@nestjs/common';
import { PasswordRecoveryService } from './password-recovery.service';
import { RequestPasswordResetDto } from './dto/request-password-reset.dto';
import { ConfirmPasswordResetDto } from './dto/confirm-password-reset.dto';

@Controller('auth/password-recovery')
export class PasswordRecoveryController {
  constructor(private readonly service: PasswordRecoveryService) {}

  @Post('request')
  request(@Body() dto: RequestPasswordResetDto) {
    return this.service.requestReset();
  }

  @Post('confirm')
  confirm(@Body() dto: ConfirmPasswordResetDto) {
    return this.service.confirmReset();
  }
}
