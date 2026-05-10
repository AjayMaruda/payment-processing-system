import { IsNotEmpty, IsNumber, IsEnum, IsOptional, IsString, IsObject, Min } from 'class-validator';
import { PaymentCurrency } from '../../../utils/constants/enum';
import { ApiProperty } from '@nestjs/swagger';

export class CreatePaymentDto {
  @ApiProperty({ example: 100.00, description: 'The amount to charge' })
  @IsNotEmpty()
  @IsNumber()
  @Min(0.01)
  amount: number;

  @ApiProperty({ example: 'USD', enum: PaymentCurrency, description: 'Currency code' })
  @IsNotEmpty()
  @IsEnum(PaymentCurrency)
  currency: PaymentCurrency;

  @ApiProperty({ example: 'Order #1234', description: 'Optional description', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: { orderId: '1234' }, description: 'Optional metadata', required: false })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
