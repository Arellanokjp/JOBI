import { Injectable, NotImplementedException } from '@nestjs/common';

/**
 * Integration point for the existing email_verification_otps and EmailService.
 * Wire this to the current AuthService OTP implementation before use.
 */
@Injectable()
export class PasswordRecoveryService {
  requestReset(): never {
    throw new NotImplementedException(
      'Connect this endpoint to the existing email OTP service before enabling password recovery.',
    );
  }

  confirmReset(): never {
    throw new NotImplementedException(
      'Connect this endpoint to the existing email OTP service before enabling password recovery.',
    );
  }
}
