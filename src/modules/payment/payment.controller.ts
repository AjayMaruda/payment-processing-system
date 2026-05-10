import {
  Body,
  Controller,
  Get,
  Headers,
  HttpStatus,
  Param,
  Post,
  Query,
  BadRequestException,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags, ApiHeader } from '@nestjs/swagger';
import { PaymentService } from './payment.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { HandleResponse } from '../../libs/helper/handlers/response.handler';
import { ResponseData, PaymentStatus } from '../../utils/constants/enum';
import { Messages } from '../../utils/constants/messages';

@ApiTags('Payments')
@Controller('payments')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Post()
  @ApiOperation({ summary: 'Initiate a payment' })
  @ApiHeader({
    name: 'x-idempotency-key',
    required: true,
    description: 'Unique key to prevent duplicate processing',
  })
  async initiatePayment(
    @Body() dto: CreatePaymentDto,
    @Headers('x-idempotency-key') idempotencyKey: string,
  ) {
    if (!idempotencyKey) {
      throw new BadRequestException('x-idempotency-key header is required');
    }

    const result = await this.paymentService.initiatePayment(
      dto,
      idempotencyKey,
    );
    return HandleResponse(
      HttpStatus.CREATED,
      ResponseData.SUCCESS,
      Messages.PAYMENT_CREATED,
      result,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get payment status by ID' })
  async getPaymentStatus(@Param('id', ParseIntPipe) id: number) {
    const result = await this.paymentService.getPaymentStatus(id);
    return HandleResponse(
      HttpStatus.OK,
      ResponseData.SUCCESS,
      Messages.PAYMENT_FOUND,
      result,
    );
  }

  @Get()
  @ApiOperation({ summary: 'List all payments with optional status filter' })
  @ApiResponse({ status: 200, description: 'Payments found' })
  async listPayments(@Query('status') status?: PaymentStatus) {
    const result = await this.paymentService.listPayments(status);
    return HandleResponse(
      HttpStatus.OK,
      ResponseData.SUCCESS,
      Messages.PAYMENTS_FOUND,
      result,
    );
  }
}
