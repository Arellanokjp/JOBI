import { ArgumentsHost, Catch, HttpStatus, Logger } from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';
import { Prisma } from '@prisma/client';
import type { Response } from 'express';

/**
 * Translates well-known Prisma errors into proper HTTP responses instead of
 * letting them surface as opaque 500s.
 */
@Catch(Prisma.PrismaClientKnownRequestError)
export class PrismaExceptionFilter extends BaseExceptionFilter {
  private readonly logger = new Logger(PrismaExceptionFilter.name);

  catch(exception: Prisma.PrismaClientKnownRequestError, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<Response>();

    const send = (status: number, message: string) =>
      response.status(status).json({
        statusCode: status,
        error: HttpStatus[status],
        message,
      });

    switch (exception.code) {
      case 'P2002':
        return send(
          HttpStatus.CONFLICT,
          'A record with the same unique value already exists.',
        );
      case 'P2003':
        return send(
          HttpStatus.CONFLICT,
          'The operation conflicts with related records (a referenced record is missing or still in use).',
        );
      case 'P2025':
        return send(HttpStatus.NOT_FOUND, 'Record not found.');
      case 'P2000':
        return send(HttpStatus.BAD_REQUEST, 'A supplied value is too long.');
      default:
        this.logger.error(`Unhandled Prisma error ${exception.code}: ${exception.message}`);
        return super.catch(exception, host);
    }
  }
}
