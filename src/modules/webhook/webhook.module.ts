import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { WebhookController } from './webhook.controller';
import { WebhookService } from './webhook.service';
import { PaymentModel } from '../../database/models/payment.model';
import { WebhookLogModel } from '../../database/models/webhook-log.model';
import { PaymentEventModel } from '../../database/models/payment-event.model';
import { GatewayModule } from '../gateway/gateway.module';

@Module({
  imports: [
    SequelizeModule.forFeature([PaymentModel, WebhookLogModel, PaymentEventModel]),
    GatewayModule,
  ],
  controllers: [WebhookController],
  providers: [WebhookService],
})
export class WebhookModule {}
