import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { PaymentController } from './payment.controller';
import { PaymentService } from './payment.service';
import { PaymentRepository } from './payment.repository';
import { PaymentModel } from '../../database/models/payment.model';
import { QueueModule } from '../../queue/queue.module';
import { GatewayModule } from '../gateway/gateway.module';

@Module({
  imports: [
    SequelizeModule.forFeature([PaymentModel]),
    QueueModule,
    GatewayModule,
  ],
  controllers: [PaymentController],
  providers: [PaymentService, PaymentRepository],
  exports: [PaymentService],
})
export class PaymentModule {}
