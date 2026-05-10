import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { UniqueConstraintError, ValidationErrorItem } from 'sequelize';
import { ResponseData } from '../../../utils/constants/enum';
import { Messages } from '../../../utils/constants/messages';

@Catch()
export class AllExceptionFilter implements ExceptionFilter {
  constructor(private readonly httpAdapter: any) {}

  catch(exception: Error, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    ctx.getRequest();
    let httpStatus =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;
    httpStatus = exception['statusCode'] ? exception['statusCode'] : httpStatus;

    exception['name'];
    let exMessage = exception['message'];
    let exResponse;

    if (exception instanceof UniqueConstraintError) {
      httpStatus = HttpStatus.CONFLICT;
      exMessage = exception.errors
        .map((err: ValidationErrorItem) => {
          const fieldName = err?.path?.replace(/_/g, ' ') ?? '';
          return `${fieldName.charAt(0).toUpperCase() + fieldName.slice(1)} ${Messages.ALREADY_EXIST}`;
        })
        .join(', ');
    }

    if (exception instanceof NotFoundException) {
      httpStatus = HttpStatus.NOT_FOUND;
      exMessage = Messages.NOT_FOUND || 'Resource not found';
    }

    if (exception instanceof HttpException) {
      exResponse = exception.getResponse();

      if (exResponse?.trace && exResponse.trace.length > 0) {
        exResponse.trace;
      }
      if (exResponse?.message && exResponse.message.length > 0) {
        exMessage = exResponse.message;
      }
      if (exResponse?.data) {
        exResponse.data;
      }
    } else {
      exception;
    }

    const responseBody = {
      statusCode: httpStatus,
      status: ResponseData.ERROR,
      message: exMessage,
    };

    Logger.error(exMessage);
    this.httpAdapter.reply(ctx.getResponse(), responseBody, httpStatus);
  }
}
