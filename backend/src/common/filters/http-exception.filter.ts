import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';

interface ErrorResponseBody {
  timestamp: string;
  path: string;
  method: string;
  statusCode: number;
  message: string;
}

@Catch()
@Injectable()
export class HttpExceptionFilter implements ExceptionFilter {
  constructor(
    @InjectPinoLogger(HttpExceptionFilter.name)
    private readonly logger: PinoLogger,
  ) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const httpContext = host.switchToHttp();
    const response = httpContext.getResponse<Response>();
    const request = httpContext.getRequest<Request>();
    const statusCode = exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const message = statusCode >= 500 ? 'Internal server error' : this.resolveMessage(exception);

    if (statusCode >= 500) {
      this.logger.error(
        {
          err: exception,
          method: request.method,
          path: request.url,
          statusCode,
        },
        'Unhandled request error',
      );
    }

    const responseBody: ErrorResponseBody = {
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      statusCode,
      message,
    };

    response.status(statusCode).json(responseBody);
  }

  private resolveMessage(exception: unknown): string {
    if (!(exception instanceof HttpException)) {
      return 'Internal server error';
    }

    const exceptionResponse = exception.getResponse();
    if (typeof exceptionResponse === 'string') {
      return exceptionResponse;
    }

    if (this.isNestValidationError(exceptionResponse)) {
      return exceptionResponse.message.join(', ');
    }

    if (this.isObjectWithMessage(exceptionResponse)) {
      return exceptionResponse.message;
    }

    return exception.message;
  }

  private isNestValidationError(value: unknown): value is { message: string[] } {
    return (
      typeof value === 'object' &&
      value !== null &&
      'message' in value &&
      Array.isArray(value.message)
    );
  }

  private isObjectWithMessage(value: unknown): value is { message: string } {
    return (
      typeof value === 'object' &&
      value !== null &&
      'message' in value &&
      typeof value.message === 'string'
    );
  }
}
