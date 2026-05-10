import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { GatewayService } from './gateway.service';
import { RazorpayService } from './razorpay.service';

@Module({
  imports: [
    HttpModule.register({
      timeout: 10000,
      maxRedirects: 3,
    }),
  ],
  providers: [GatewayService, RazorpayService],
  exports: [GatewayService, RazorpayService],
})
export class GatewayModule {}
