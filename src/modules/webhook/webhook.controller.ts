import { Body, Controller, HttpCode, HttpStatus, Post, Headers } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { WebhookService } from './webhook.service';
import { WebhookPayloadDto } from './dto/webhook-payload.dto';
import { HandleResponse } from '../../libs/helper/handlers/response.handler';
import { ResponseData } from '../../utils/constants/enum';
import { Messages } from '../../utils/constants/messages';

@ApiTags('Webhooks')
@Controller('webhooks')
export class WebhookController {
  constructor(private readonly webhookService: WebhookService) {}

  @Post('gateway')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Handle async updates from payment gateway' })
  @ApiResponse({ status: 200, description: 'Webhook processed' })
  async handleGatewayWebhook(@Body() payload: WebhookPayloadDto) {
    await this.webhookService.handleGatewayWebhook(payload);
    return HandleResponse(
      HttpStatus.OK,
      ResponseData.SUCCESS,
      Messages.WEBHOOK_RECEIVED,
    );
  }

  @Post('razorpay')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Handle async updates from Razorpay' })
  @ApiResponse({ status: 200, description: 'Webhook processed' })
  async handleRazorpayWebhook(
    @Body() payload: any,
    @Headers('x-razorpay-signature') signature: string,
  ) {
    await this.webhookService.handleRazorpayWebhook(payload, signature);
    return HandleResponse(
      HttpStatus.OK,
      ResponseData.SUCCESS,
      'Razorpay webhook received',
    );
  }
}
