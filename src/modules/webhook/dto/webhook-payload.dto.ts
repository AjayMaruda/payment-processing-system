import { IsNotEmpty, IsString, IsNumber, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class WebhookPayloadDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  eventId: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  eventType: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsNumber()
  paymentId: number;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  referenceId: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  status: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  timestamp: string;
}
