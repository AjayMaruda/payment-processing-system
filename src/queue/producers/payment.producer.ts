import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Queue } from 'bullmq';
import { PAYMENT_QUEUE } from '../queue.constants';
import { Messages } from '../../utils/constants/messages';

export interface PaymentJobData {
  paymentId: number;
  attempt?: number;
}

@Injectable()
export class PaymentProducer {
  private readonly logger = new Logger(PaymentProducer.name);

  constructor(
    @InjectQueue(PAYMENT_QUEUE) private readonly paymentQueue: Queue,
  ) {}

  /**
   * Enqueues a payment processing job.
   * BullMQ will automatically handle retries with exponential backoff
   * based on the defaultJobOptions configured in QueueModule.
   */
  async enqueuePayment(paymentId: number): Promise<void> {
    const jobData: PaymentJobData = { paymentId };

    const job = await this.paymentQueue.add('process-payment', jobData, {
      jobId: `payment-${paymentId}`, // Deterministic jobId prevents duplicate jobs
    });

    this.logger.log(
      `[ENQUEUED] ${Messages.QUEUE_JOB_ENQUEUED} | paymentId=${paymentId} | jobId=${job.id}`,
    );
  }
}
