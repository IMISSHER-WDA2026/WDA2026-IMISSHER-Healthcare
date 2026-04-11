import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';

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

    const exceptionResponse: any =
      exception instanceof HttpException
        ? exception.getResponse()
        : { message: 'Lỗi hệ thống nội bộ', error: 'Internal Server Error' };

    const message =
      typeof exceptionResponse.message === 'string'
        ? exceptionResponse.message
        : Array.isArray(exceptionResponse.message)
        ? exceptionResponse.message[0]
        : 'Đã xảy ra lỗi';

    response.status(status).json({
      statusCode: status,
      message: message,
      error: exceptionResponse.error || 'Lỗi',
      path: request.url,
      timestamp: new Date().toISOString(),
    });
  }
}