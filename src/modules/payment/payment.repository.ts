import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { PaymentModel } from '../../database/models/payment.model';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { PaymentStatus } from '../../utils/constants/enum';
import { Transaction } from 'sequelize';

@Injectable()
export class PaymentRepository {
  constructor(
    @InjectModel(PaymentModel)
    private readonly paymentModel: typeof PaymentModel,
  ) {}

  async create(
    dto: CreatePaymentDto,
    idempotencyKey: string,
    tx?: Transaction,
  ): Promise<PaymentModel> {
    return this.paymentModel.create(
      {
        ...dto,
        idempotencyKey,
        status: PaymentStatus.PENDING,
      },
      { transaction: tx },
    );
  }

  async findByIdempotencyKey(key: string): Promise<PaymentModel | null> {
    return this.paymentModel.findOne({ where: { idempotencyKey: key } });
  }

  async findById(
    id: number,
    options?: { lock?: boolean; transaction?: Transaction },
  ): Promise<PaymentModel | null> {
    return this.paymentModel.findByPk(id, {
      lock: options?.lock ? Transaction.LOCK.UPDATE : undefined,
      transaction: options?.transaction,
    });
  }

  async findAll(filters: { status?: PaymentStatus }): Promise<PaymentModel[]> {
    const where: any = {};
    if (filters.status) {
      where.status = filters.status;
    }
    return this.paymentModel.findAll({ where });
  }
}
