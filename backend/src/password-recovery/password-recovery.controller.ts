import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { PasswordRecoveryService } from './password-recovery.service';
import { RequestPasswordResetDto } from './dto/request-password-reset.dto';
import { ConfirmPasswordResetDto } from './dto/confirm-password-reset.dto';

@Controller('auth/password-recovery')
export class PasswordRecoveryController {
  constructor(private readonly service: PasswordRecoveryService) {}

  @Post('request')
  @HttpCode(HttpStatus.OK)
  request(@Body() dto: RequestPasswordResetDto) {
    return this.service.requestReset(dto);
  }

  @Post('confirm')
  @HttpCode(HttpStatus.OK)
  confirm(@Body() dto: ConfirmPasswordResetDto) {
    return this.service.confirmReset(dto);
  }
}
