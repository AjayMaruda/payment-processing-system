import {
  BelongsTo,
  Column,
  CreatedAt,
  DataType,
  Default,
  ForeignKey,
  Model,
  PrimaryKey,
  AutoIncrement,
  Table,
} from 'sequelize-typescript';
import { PaymentStatus } from '../../utils/constants/enum';
import { PaymentModel } from './payment.model';

@Table({
  tableName: 'payment_events',
  timestamps: true,
  updatedAt: false,
})
export class PaymentEventModel extends Model {
  @PrimaryKey
  @AutoIncrement
  @Column({ type: DataType.INTEGER })
  declare id: number;

  @ForeignKey(() => PaymentModel)
  @Column({ type: DataType.INTEGER, allowNull: false })
  declare paymentId: number;

  @BelongsTo(() => PaymentModel, { foreignKey: 'paymentId' })
  declare payment: PaymentModel;

  @Column({
    type: DataType.ENUM(...Object.values(PaymentStatus)),
    allowNull: true,
  })
  declare fromStatus: PaymentStatus | null;

  @Column({
    type: DataType.ENUM(...Object.values(PaymentStatus)),
    allowNull: false,
  })
  declare toStatus: PaymentStatus;

  @Column({ type: DataType.TEXT, allowNull: true })
  declare reason: string | null;

  @Column({ type: DataType.JSONB, allowNull: true, defaultValue: {} })
  declare metadata: Record<string, unknown>;

  @CreatedAt
  declare createdAt: Date;
}
