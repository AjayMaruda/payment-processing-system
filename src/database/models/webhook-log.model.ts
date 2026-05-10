import {
  BelongsTo,
  Column,
  DataType,
  Default,
  ForeignKey,
  Index,
  Model,
  PrimaryKey,
  AutoIncrement,
  Table,
} from 'sequelize-typescript';
import { PaymentModel } from './payment.model';

@Table({
  tableName: 'webhook_logs',
  timestamps: true,
  updatedAt: false,
})
export class WebhookLogModel extends Model {
  @PrimaryKey
  @AutoIncrement
  @Column({ type: DataType.INTEGER })
  declare id: number;

  @Index({ unique: true })
  @Column({ type: DataType.STRING, allowNull: false, unique: true })
  declare eventId: string;

  @ForeignKey(() => PaymentModel)
  @Column({ type: DataType.INTEGER, allowNull: false })
  declare paymentId: number;

  @BelongsTo(() => PaymentModel, { foreignKey: 'paymentId' })
  declare payment: PaymentModel;

  @Column({ type: DataType.STRING, allowNull: true })
  declare eventType: string | null;

  @Column({ type: DataType.JSONB, allowNull: true, defaultValue: {} })
  declare payload: Record<string, unknown>;

  @Column({ type: DataType.DATE, allowNull: true })
  declare processedAt: Date | null;
}
