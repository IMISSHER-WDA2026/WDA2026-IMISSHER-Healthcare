import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';

interface ExceptionResponsePayload {
  message?: string | string[];
  error?: string;
}

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const exceptionResponse: string | ExceptionResponsePayload =
      exception instanceof HttpException
        ? (exception.getResponse() as string | ExceptionResponsePayload)
        : { message: 'Internal server error', error: 'Internal Server Error' };

    const message =
      typeof exceptionResponse === 'string'
        ? exceptionResponse
        : typeof exceptionResponse.message === 'string'
          ? exceptionResponse.message
          : Array.isArray(exceptionResponse.message)
            ? exceptionResponse.message[0]
            : 'An error occurred';

    const error =
      typeof exceptionResponse === 'string'
        ? 'Error'
        : exceptionResponse.error || 'Error';

    response.status(status).json({
      statusCode: status,
      message: message,
      error,
      path: request.url,
      timestamp: new Date().toISOString(),
    });
  }
}
