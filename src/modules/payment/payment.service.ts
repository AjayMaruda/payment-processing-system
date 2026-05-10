import { Injectable, ConflictException, Logger, NotFoundException } from '@nestjs/common';
import { PaymentRepository } from './payment.repository';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { PaymentModel } from '../../database/models/payment.model';
import { PaymentProducer } from '../../queue/producers/payment.producer';
import { Messages } from '../../utils/constants/messages';
import { PaymentStatus } from '../../utils/constants/enum';
import { RazorpayService } from '../gateway/razorpay.service';

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);

  constructor(
    private readonly paymentRepository: PaymentRepository,
    private readonly paymentProducer: PaymentProducer,
    private readonly razorpayService: RazorpayService,
  ) {}

  async initiatePayment(
    dto: CreatePaymentDto,
    idempotencyKey: string,
  ): Promise<PaymentModel> {
    // 1. Check Idempotency
    const existingPayment = await this.paymentRepository.findByIdempotencyKey(idempotencyKey);
    if (existingPayment) {
      this.logger.warn(
        `[IDEMPOTENCY] ${Messages.PAYMENT_DUPLICATE} | key=${idempotencyKey} | paymentId=${existingPayment.id}`,
      );
      return existingPayment;
    }

    // 2. Create Payment in PENDING state
    const payment = await this.paymentRepository.create(dto, idempotencyKey);
    
    this.logger.log(
      `[CREATED] ${Messages.PAYMENT_CREATED} | paymentId=${payment.id} | status=${payment.status}`,
    );

    // Create Razorpay Order (Mocked)
    try {
      const order = await this.razorpayService.createOrder(
        payment.amount,
        payment.currency,
        `receipt_${payment.id}`,
      );
      
      // Update payment with Razorpay Order ID
      await payment.update({ gatewayReferenceId: order.id });
      this.logger.log(`[RAZORPAY] Order created | orderId=${order.id} | paymentId=${payment.id}`);
    } catch (err) {
      this.logger.error(`[RAZORPAY_ERROR] Failed to create order | paymentId=${payment.id} | error=${(err as Error).message}`);
    }

    // 3. Enqueue for processing
    await this.paymentProducer.enqueuePayment(payment.id);

    return payment;
  }

  async getPaymentStatus(id: number): Promise<PaymentModel> {
    const payment = await this.paymentRepository.findById(id);
    if (!payment) {
      throw new NotFoundException(Messages.PAYMENT_NOT_FOUND);
    }
    return payment;
  }

  async listPayments(status?: PaymentStatus): Promise<PaymentModel[]> {
    return this.paymentRepository.findAll({ status });
  }
}
