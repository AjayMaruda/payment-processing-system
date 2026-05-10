import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Job } from 'bullmq';
import { Sequelize } from 'sequelize-typescript';
import { PaymentModel } from '../../database/models/payment.model';
import { PaymentEventModel } from '../../database/models/payment-event.model';
import { GatewayService } from '../../modules/gateway/gateway.service';
import { PaymentStatus } from '../../utils/constants/enum';
import { Messages } from '../../utils/constants/messages';
import { PAYMENT_QUEUE } from '../queue.constants';
import { PaymentJobData } from '../producers/payment.producer';
import { Transaction } from 'sequelize';

@Processor(PAYMENT_QUEUE, {
  concurrency: 5, // Process up to 5 jobs in parallel
})
export class PaymentConsumer extends WorkerHost {
  private readonly logger = new Logger(PaymentConsumer.name);

  constructor(
    @InjectModel(PaymentModel) private readonly paymentModel: typeof PaymentModel,
    @InjectModel(PaymentEventModel) private readonly eventModel: typeof PaymentEventModel,
    private readonly gatewayService: GatewayService,
    private readonly sequelize: Sequelize,
  ) {
    super();
  }

  /**
   * Main job processor. BullMQ calls this for every job dequeued.
   * If this method throws, BullMQ will automatically retry the job
   * using the exponential backoff strategy defined in QueueModule.
   */
  async process(job: Job<PaymentJobData>): Promise<void> {
    const { paymentId } = job.data;
    const attempt = job.attemptsMade + 1;
    const maxAttempts = job.opts.attempts ?? 3;

    this.logger.log(
      `[PROCESSING] paymentId=${paymentId} | attempt=${attempt}/${maxAttempts}`,
    );

    // ─── Step 1: Lock the row and transition PENDING → PROCESSING ────────────
    await this.sequelize.transaction(async (t: Transaction) => {
      const payment = await this.paymentModel.findOne({
        where: { id: paymentId },
        lock: t.LOCK.UPDATE, // SELECT ... FOR UPDATE prevents race conditions
        transaction: t,
      });

      if (!payment) {
        this.logger.error(`[ERROR] Payment not found | paymentId=${paymentId}`);
        throw new Error(`Payment ${paymentId} not found`);
      }

      // If already in a terminal state (e.g. webhook arrived first), skip processing
      if (
        payment.status === PaymentStatus.SUCCESS ||
        payment.status === PaymentStatus.FAILED
      ) {
        this.logger.warn(
          `[SKIPPED] Payment already in terminal state=${payment.status} | paymentId=${paymentId}`,
        );
        return;
      }

      // Only allow transition to PROCESSING if currently PENDING or RETRYING
      if (
        payment.status !== PaymentStatus.PENDING &&
        payment.status !== PaymentStatus.RETRYING
      ) {
        this.logger.warn(
          `[SKIPPED] Invalid transition from ${payment.status} → PROCESSING | paymentId=${paymentId}`,
        );
        return;
      }

      const prevStatus = payment.status;
      await payment.update(
        { status: PaymentStatus.PROCESSING, retryCount: attempt - 1 },
        { transaction: t },
      );

      await this.eventModel.create(
        {
          paymentId,
          fromStatus: prevStatus,
          toStatus: PaymentStatus.PROCESSING,
          reason: attempt > 1 ? `retry_attempt_${attempt - 1}` : 'initial_processing',
          metadata: { attempt, jobId: job.id },
        },
        { transaction: t },
      );
    });

    // ─── Step 2: Call the external gateway (outside transaction) ─────────────
    try {
      const result = await this.gatewayService.charge({
        paymentId,
        amount: (await this.paymentModel.findByPk(paymentId))?.amount ?? 0,
      });

      // ─── Step 3: Gateway success → transition PROCESSING → SUCCESS ─────────
      await this.sequelize.transaction(async (t: Transaction) => {
        const payment = await this.paymentModel.findOne({
          where: { id: paymentId },
          lock: t.LOCK.UPDATE,
          transaction: t,
        });

        // Guard: don't overwrite a SUCCESS/FAILED set by a racing webhook
        if (
          payment?.status === PaymentStatus.SUCCESS ||
          payment?.status === PaymentStatus.FAILED
        ) {
          this.logger.warn(
            `[SKIPPED] Terminal state already set by webhook | paymentId=${paymentId} status=${payment.status}`,
          );
          return;
        }

        await payment?.update(
          {
            status: PaymentStatus.SUCCESS,
            gatewayReferenceId: result.referenceId,
          },
          { transaction: t },
        );

        await this.eventModel.create(
          {
            paymentId,
            fromStatus: PaymentStatus.PROCESSING,
            toStatus: PaymentStatus.SUCCESS,
            reason: 'gateway_success',
            metadata: { referenceId: result.referenceId, attempt },
          },
          { transaction: t },
        );
      });

      this.logger.log(
        `[SUCCESS] Payment processed | paymentId=${paymentId} | ref=${result.referenceId}`,
      );
    } catch (error) {
      // ─── Step 4: Gateway failed → log RETRYING, then throw so BullMQ retries ─
      const isLastAttempt = attempt >= maxAttempts;
      const nextStatus = isLastAttempt
        ? PaymentStatus.FAILED
        : PaymentStatus.RETRYING;

      await this.sequelize.transaction(async (t: Transaction) => {
        const payment = await this.paymentModel.findOne({
          where: { id: paymentId },
          lock: t.LOCK.UPDATE,
          transaction: t,
        });

        if (
          payment?.status === PaymentStatus.SUCCESS ||
          payment?.status === PaymentStatus.FAILED
        ) {
          return; // Already finalized by webhook — do nothing
        }

        await payment?.update({ status: nextStatus }, { transaction: t });

        await this.eventModel.create(
          {
            paymentId,
            fromStatus: PaymentStatus.PROCESSING,
            toStatus: nextStatus,
            reason: isLastAttempt ? 'max_retries_exceeded' : `gateway_failure_attempt_${attempt}`,
            metadata: {
              error: (error as Error).message,
              attempt,
              isLastAttempt,
            },
          },
          { transaction: t },
        );
      });

      if (isLastAttempt) {
        this.logger.error(
          `[FAILED] ${Messages.QUEUE_JOB_FAILED} | paymentId=${paymentId} | error=${(error as Error).message}`,
        );
      } else {
        this.logger.warn(
          `[RETRY] ${Messages.QUEUE_JOB_RETRY} | paymentId=${paymentId} | attempt=${attempt}/${maxAttempts} | error=${(error as Error).message}`,
        );
      }

      // Re-throw so BullMQ can schedule the next retry attempt
      throw error;
    }
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job<PaymentJobData>, error: Error): void {
    this.logger.error(
      `[JOB_FAILED] jobId=${job.id} | paymentId=${job.data.paymentId} | finalError=${error.message}`,
    );
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job<PaymentJobData>): void {
    this.logger.log(
      `[JOB_COMPLETED] jobId=${job.id} | paymentId=${job.data.paymentId}`,
    );
  }
}
