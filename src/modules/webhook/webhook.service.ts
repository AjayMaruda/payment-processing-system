import { Injectable, ConflictException, Logger, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Sequelize } from 'sequelize-typescript';
import { PaymentModel } from '../../database/models/payment.model';
import { WebhookLogModel } from '../../database/models/webhook-log.model';
import { PaymentEventModel } from '../../database/models/payment-event.model';
import { PaymentStatus } from '../../utils/constants/enum';
import { Messages } from '../../utils/constants/messages';
import { Transaction } from 'sequelize';
import { RazorpayService } from '../gateway/razorpay.service';

import { WebhookPayloadDto } from './dto/webhook-payload.dto';

@Injectable()
export class WebhookService {
  private readonly logger = new Logger(WebhookService.name);

  constructor(
    @InjectModel(PaymentModel) private readonly paymentModel: typeof PaymentModel,
    @InjectModel(WebhookLogModel) private readonly webhookLogModel: typeof WebhookLogModel,
    @InjectModel(PaymentEventModel) private readonly eventModel: typeof PaymentEventModel,
    private readonly sequelize: Sequelize,
    private readonly razorpayService: RazorpayService,
  ) {}

  async handleGatewayWebhook(payload: WebhookPayloadDto): Promise<void> {
    const { eventId, paymentId, status, referenceId } = payload;

    if (!eventId || !paymentId || !status) {
      throw new BadRequestException(Messages.WEBHOOK_INVALID_PAYLOAD);
    }

    this.logger.log(
      `[WEBHOOK] Received eventId=${eventId} | paymentId=${paymentId} | status=${status}`,
    );

    // 1. Check Webhook Idempotency
    const existingLog = await this.webhookLogModel.findOne({ where: { eventId } });
    if (existingLog) {
      this.logger.warn(`[WEBHOOK] ${Messages.WEBHOOK_DUPLICATE} | eventId=${eventId}`);
      return; // Silently ignore duplicate webhook deliveries
    }

    // 2. Process state transition with row-level locking
    await this.sequelize.transaction(async (t: Transaction) => {
      const payment = await this.paymentModel.findOne({
        where: { id: paymentId },
        lock: t.LOCK.UPDATE, // SELECT ... FOR UPDATE prevents race conditions
        transaction: t,
      });

      if (!payment) {
        this.logger.error(`[WEBHOOK] Payment not found | paymentId=${paymentId}`);
        throw new BadRequestException(Messages.PAYMENT_NOT_FOUND);
      }

      // If already in a terminal state, don't allow changes (especially success -> failed)
      if (payment.status === PaymentStatus.SUCCESS || payment.status === PaymentStatus.FAILED) {
        this.logger.warn(
          `[WEBHOOK_SKIPPED] Payment already in terminal state=${payment.status} | paymentId=${paymentId}`,
        );
        
        // Still log the webhook event as processed so we don't try to process it again
        await this.webhookLogModel.create(
          {
            eventId,
            paymentId,
            eventType: payload.eventType,
            payload,
            processedAt: new Date(),
          },
          { transaction: t },
        );
        return;
      }

      // Map gateway status to our internal PaymentStatus
      const targetStatus = status === 'SUCCESS' ? PaymentStatus.SUCCESS : PaymentStatus.FAILED;

      const prevStatus = payment.status;
      
      // Update payment
      await payment.update(
        {
          status: targetStatus,
          gatewayReferenceId: referenceId || payment.gatewayReferenceId,
        },
        { transaction: t },
      );

      // Log event
      await this.eventModel.create(
        {
          paymentId,
          fromStatus: prevStatus,
          toStatus: targetStatus,
          reason: 'webhook_notification',
          metadata: { eventId, payload },
        },
        { transaction: t },
      );

      // Record webhook log to prevent double processing
      await this.webhookLogModel.create(
        {
          eventId,
          paymentId,
          eventType: payload.eventType,
          payload,
          processedAt: new Date(),
        },
        { transaction: t },
      );
    });
  }

  async handleRazorpayWebhook(payload: any, signature: string): Promise<void> {
    this.logger.log(`[RAZORPAY_WEBHOOK] Received webhook | event=${payload.event}`);

    const isValid = this.razorpayService.verifyWebhookSignature(
      JSON.stringify(payload),
      signature,
      process.env.RAZORPAY_WEBHOOK_SECRET || 'mock_secret',
    );

    if (!isValid) {
      this.logger.warn(`[RAZORPAY_WEBHOOK] Invalid signature`);
      throw new BadRequestException('Invalid signature');
    }

    const event = payload.event;
    const orderId = payload.payload?.payment?.entity?.order_id;

    if (!orderId) {
      this.logger.warn(`[RAZORPAY_WEBHOOK] No order_id found in payload`);
      return;
    }

    await this.sequelize.transaction(async (t: Transaction) => {
      const payment = await this.paymentModel.findOne({
        where: { gatewayReferenceId: orderId },
        lock: t.LOCK.UPDATE,
        transaction: t,
      });

      if (!payment) {
        this.logger.error(`[RAZORPAY_WEBHOOK] Payment not found | orderId=${orderId}`);
        return;
      }

      if (payment.status === PaymentStatus.SUCCESS || payment.status === PaymentStatus.FAILED) {
        this.logger.warn(`[RAZORPAY_WEBHOOK] Payment already in terminal state | paymentId=${payment.id}`);
        return;
      }

      let targetStatus: PaymentStatus = payment.status;
      if (event === 'payment.captured') {
        targetStatus = PaymentStatus.SUCCESS;
      } else if (event === 'payment.failed') {
        targetStatus = PaymentStatus.FAILED;
      }

      const prevStatus = payment.status;
      await payment.update({ status: targetStatus }, { transaction: t });

      await this.eventModel.create(
        {
          paymentId: payment.id,
          fromStatus: prevStatus,
          toStatus: targetStatus,
          reason: `razorpay_webhook_${event}`,
          metadata: { payload },
        },
        { transaction: t },
      );

      this.logger.log(`[RAZORPAY_WEBHOOK] Payment updated | paymentId=${payment.id} | ${prevStatus} → ${targetStatus}`);
    });
  }
}
