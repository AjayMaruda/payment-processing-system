import { HttpStatus } from '@nestjs/common';
import { ResponseData } from '../../../utils/constants/enum';

export function HandleResponse<T = unknown>(
  statusCode: HttpStatus,
  status: ResponseData,
  message?: string,
  data?: T,
  error?: unknown,
) {
  const success = status === ResponseData.SUCCESS;

  return {
    statusCode:
      statusCode ??
      (success ? HttpStatus.OK : HttpStatus.INTERNAL_SERVER_ERROR),
    status,
    message,
    data,
    error,
  };
}
