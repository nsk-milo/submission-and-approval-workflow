import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

/**
 * Global exception filter producing a consistent error envelope for every
 * failure, matching the documented API error contract:
 *   { statusCode, message, errors?, detail?, timestamp, path }
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let errors: Record<string, string[]> | undefined;
    let detail: string | undefined;

    if (exception instanceof HttpException) {
      statusCode = exception.getStatus();
      const res = exception.getResponse();

      if (typeof res === 'string') {
        message = res;
      } else if (typeof res === 'object' && res !== null) {
        const body = res as Record<string, any>;
        // class-validator's default BadRequest puts an array in `message`.
        if (Array.isArray(body.message)) {
          message = 'Validation failed';
          errors = this.normalizeValidationErrors(body.message);
        } else if (typeof body.message === 'string') {
          message = body.message;
        }
        if (body.errors) errors = body.errors;
        if (body.detail) detail = body.detail;
      }
    } else if (exception instanceof Error) {
      detail = exception.message;
      this.logger.error(exception.message, exception.stack);
    }

    response.status(statusCode).json({
      statusCode,
      message,
      ...(errors ? { errors } : {}),
      ...(detail ? { detail } : {}),
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }

  private normalizeValidationErrors(messages: string[]): Record<string, string[]> {
    // Best-effort grouping of "field must be ..." messages by their field name.
    return messages.reduce<Record<string, string[]>>((acc, msg) => {
      const field = msg.split(' ')[0];
      acc[field] = acc[field] ? [...acc[field], msg] : [msg];
      return acc;
    }, {});
  }
}
