import { ExceptionFilter, Catch, ArgumentsHost, HttpStatus, Logger } from '@nestjs/common';
import { Request, Response } from 'express';
import { Prisma } from '../../generated/prisma/client';

/**
 * Catches Prisma database errors and converts them to clean HTTP responses.
 *
 * Handled error codes:
 *  P2002 — Unique constraint violation  → 409 Conflict
 *  P2025 — Record not found (Prisma)    → 404 Not Found
 *  P2003 — Foreign key constraint       → 400 Bad Request
 *  P2014 — Required relation violation  → 400 Bad Request
 *  (all other Prisma errors)            → 400 Bad Request
 */
@Catch(Prisma.PrismaClientKnownRequestError)
export class PrismaExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(PrismaExceptionFilter.name);

  catch(exception: Prisma.PrismaClientKnownRequestError, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    this.logger.error(
      `Prisma error ${exception.code} on ${request.method} ${request.url}`,
      exception.message,
    );

    const { status, message } = this.mapPrismaError(exception);

    response.status(status).json({
      statusCode: status,
      message,
      error: HttpStatus[status] ?? 'Error',
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }

  private mapPrismaError(exception: Prisma.PrismaClientKnownRequestError): {
    status: number;
    message: string;
  } {
    switch (exception.code) {
      case 'P2002': {
        // meta.target is the list of fields that violated the unique constraint
        const fields = (exception.meta?.target as string[]) ?? [];
        const fieldName = fields.length > 0 ? fields[0] : 'field';
        const readable = fieldName.replace(/_/g, ' ');
        return {
          status: HttpStatus.CONFLICT,
          message: `${readable} is already in use`,
        };
      }

      case 'P2025':
        return {
          status: HttpStatus.NOT_FOUND,
          message: (exception.meta?.cause as string) ?? 'Record not found',
        };

      case 'P2003':
        return {
          status: HttpStatus.BAD_REQUEST,
          message: 'Related record not found',
        };

      case 'P2014':
        return {
          status: HttpStatus.BAD_REQUEST,
          message: 'Required relation violation',
        };

      default:
        this.logger.warn(`Unhandled Prisma error code: ${exception.code}`);
        return {
          status: HttpStatus.BAD_REQUEST,
          message: 'Database operation failed',
        };
    }
  }
}
