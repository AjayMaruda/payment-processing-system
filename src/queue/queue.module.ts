import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { PaymentConsumer } from './consumers/payment.consumer';
import { PaymentProducer } from './producers/payment.producer';
import { SequelizeModule } from '@nestjs/sequelize';
import { PaymentModel } from '../database/models/payment.model';
import { PaymentEventModel } from '../database/models/payment-event.model';
import { PAYMENT_QUEUE } from './queue.constants';
import { GatewayModule } from '../modules/gateway/gateway.module';

@Module({
  imports: [
    BullModule.registerQueue({
      name: PAYMENT_QUEUE,
      defaultJobOptions: {
        attempts: Number(process.env.MAX_RETRY_ATTEMPTS) || 3,
        backoff: {
          type: 'exponential',
          delay: Number(process.env.RETRY_BACKOFF_DELAY) || 2000,
        },
        removeOnComplete: 100,
        removeOnFail: 200,
      },
    }),
    SequelizeModule.forFeature([PaymentModel, PaymentEventModel]),
    GatewayModule,
  ],
  providers: [PaymentProducer, PaymentConsumer],
  exports: [PaymentProducer, BullModule],
})
export class QueueModule {}
