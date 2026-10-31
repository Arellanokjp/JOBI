import { INestApplication, ValidationPipe } from '@nestjs/common';
import { PrismaExceptionFilter } from './common/prisma-exception.filter';

/** Shared by main.ts and the tests so both run with identical global config. */
export function configureApp(app: INestApplication): void {
  app.setGlobalPrefix('api/v1');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.useGlobalFilters(new PrismaExceptionFilter(app.getHttpAdapter()));

  // CORS_ORIGIN is a comma-separated list. In development any origin is
  // allowed when it is not set; in production it must be set explicitly.
  const origins = process.env.CORS_ORIGIN?.split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  if (origins?.length) {
    app.enableCors({ origin: origins, credentials: true });
  } else if (process.env.NODE_ENV !== 'production') {
    app.enableCors();
  }
}
