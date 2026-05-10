import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { SequelizeModule, SequelizeModuleOptions } from '@nestjs/sequelize';
import { Dialect } from 'sequelize';
import * as dotenv from 'dotenv';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { BullModule } from '@nestjs/bullmq';
import { PaymentModule } from './modules/payment/payment.module';
import { WebhookModule } from './modules/webhook/webhook.module';
import { GatewayModule } from './modules/gateway/gateway.module';
import { QueueModule } from './queue/queue.module';
import { PaymentModel } from './database/models/payment.model';
import { PaymentEventModel } from './database/models/payment-event.model';
import { WebhookLogModel } from './database/models/webhook-log.model';

dotenv.config();

const DB_DIALECT = (process.env.DB_DIALECT || 'postgres') as Dialect;

const config: SequelizeModuleOptions = {
  dialect: DB_DIALECT,
  autoLoadModels: true,
  models: [PaymentModel, PaymentEventModel, WebhookLogModel],
  define: {
    timestamps: true,
  },
};

@Module({
  imports: [
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'public'),
      serveRoot: '/public',
    }),
    SequelizeModule.forRoot({
      ...config,
      dialect: DB_DIALECT,
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT),
      username: process.env.DB_USERNAME,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_DATABASE,
      autoLoadModels: true,
      synchronize: true,
      sync: { force: true },
      logging: false, // Turn off noisy logs, we have structured logging
    }),
    BullModule.forRoot({
      connection: {
        host: process.env.REDIS_HOST || 'localhost',
        port: Number(process.env.REDIS_PORT) || 6379,
      },
    }),
    QueueModule,
    PaymentModule,
    WebhookModule,
    GatewayModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
