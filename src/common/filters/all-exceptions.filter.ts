import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

/**
 * Catch-all exception filter.
 *
 * - HttpException instances are passed through with their original status & message.
 * - Everything else (unexpected runtime errors, unhandled Prisma variants, etc.)
 *   is logged and returned as a generic 500 response so internal details never
 *   leak to the client.
 *
 * Register this AFTER PrismaExceptionFilter in main.ts so Prisma errors are
 * handled with a specific message before falling through here.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    // If it's already a NestJS HttpException, forward it as-is
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      // getResponse() can be a string or an object
      const body =
        typeof exceptionResponse === 'string'
          ? { statusCode: status, message: exceptionResponse, error: HttpStatus[status] }
          : exceptionResponse;

      return response.status(status).json({
        ...body,
        timestamp: new Date().toISOString(),
        path: request.url,
      });
    }

    // Log unexpected errors with full details (server-side only)
    this.logger.error(
      `Unhandled exception on ${request.method} ${request.url}`,
      exception instanceof Error ? exception.stack : String(exception),
    );

    // Return a safe generic response to the client
    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'An unexpected error occurred. Please try again later.',
      error: 'Internal Server Error',
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}
