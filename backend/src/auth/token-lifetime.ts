import type { JwtSignOptions } from '@nestjs/jwt';

/**
 * Reads JWT_EXPIRES_IN (default "1h"). A bare number such as "3600" means
 * seconds; the jsonwebtoken library would otherwise read the string as ms.
 */
export function accessTokenLifetime(): NonNullable<JwtSignOptions['expiresIn']> {
  const raw = (process.env.JWT_EXPIRES_IN ?? '1h').trim().replace(/^"|"$/g, '');
  return (/^\d+$/.test(raw) ? Number(raw) : raw) as NonNullable<
    JwtSignOptions['expiresIn']
  >;
}
