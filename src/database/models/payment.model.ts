import {
  Column,
  DataType,
  Default,
  Index,
  Model,
  PrimaryKey,
  AutoIncrement,
  Table,
  HasMany,
  CreatedAt,
  UpdatedAt,
} from 'sequelize-typescript';
import { PaymentCurrency, PaymentStatus } from '../../utils/constants/enum';
import { PaymentEventModel } from './payment-event.model';
import { WebhookLogModel } from './webhook-log.model';

@Table({
  tableName: 'payments',
  timestamps: true,
})
export class PaymentModel extends Model {
  @PrimaryKey
  @AutoIncrement
  @Column({ type: DataType.INTEGER })
  declare id: number;

  @Index({ unique: true })
  @Column({ type: DataType.STRING, allowNull: false, unique: true })
  declare idempotencyKey: string;

  @Column({ type: DataType.DECIMAL(12, 2), allowNull: false })
  declare amount: number;

  @Column({
    type: DataType.ENUM(...Object.values(PaymentCurrency)),
    allowNull: false,
    defaultValue: PaymentCurrency.USD,
  })
  declare currency: PaymentCurrency;

  @Default(PaymentStatus.PENDING)
  @Column({
    type: DataType.ENUM(...Object.values(PaymentStatus)),
    allowNull: false,
  })
  declare status: PaymentStatus;

  @Default(0)
  @Column({ type: DataType.INTEGER })
  declare retryCount: number;

  @Column({ type: DataType.STRING, allowNull: true })
  declare gatewayReferenceId: string | null;

  @Column({ type: DataType.STRING, allowNull: true })
  declare description: string | null;

  @Column({ type: DataType.JSONB, allowNull: true, defaultValue: {} })
  declare metadata: Record<string, unknown>;

  @HasMany(() => PaymentEventModel, { foreignKey: 'paymentId' })
  declare events: PaymentEventModel[];

  @HasMany(() => WebhookLogModel, { foreignKey: 'paymentId' })
  declare webhookLogs: WebhookLogModel[];

  @CreatedAt
  declare createdAt: Date;

  @UpdatedAt
  declare updatedAt: Date;
}
