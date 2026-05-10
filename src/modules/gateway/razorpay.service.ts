import { Injectable, Logger } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class RazorpayService {
  private readonly logger = new Logger(RazorpayService.name);

  // We are mocking the SDK behavior so we don't need real keys to be valid
  private readonly keyId = process.env.RAZORPAY_KEY_ID || 'rzp_test_mock';
  private readonly keySecret = process.env.RAZORPAY_KEY_SECRET || 'mock_secret';

  /**
   * Simulates creating an order in Razorpay.
   * Razorpay expects the amount in the smallest currency unit (e.g., paise for INR, cents for USD).
   */
  async createOrder(amount: number, currency: string, receipt: string) {
    this.logger.log(`[RAZORPAY_MOCK] Creating order | amount=${amount} | currency=${currency} | receipt=${receipt}`);
    
    // Simulate a short network delay
    await new Promise(resolve => setTimeout(resolve, 500));

    // Generate a mock Razorpay order ID
    const orderId = `order_${uuidv4().substring(0, 14).replace(/-/g, '')}`;
    
    return {
      id: orderId,
      entity: 'order',
      amount: amount * 100, // Convert to smallest unit
      amount_paid: 0,
      amount_due: amount * 100,
      currency: currency,
      receipt: receipt,
      status: 'created',
      created_at: Math.floor(Date.now() / 1000),
    };
  }

  /**
   * Simulates verifying a webhook signature.
   * In a real app, you would use crypto.createHmac and compare with the header.
   */
  verifyWebhookSignature(payload: string, signature: string, secret: string): boolean {
    this.logger.log(`[RAZORPAY_MOCK] Verifying webhook signature`);
    // For mock purposes, we assume the signature is always valid if it exists
    return !!signature;
  }
}
