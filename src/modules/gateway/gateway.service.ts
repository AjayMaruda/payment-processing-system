import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { v4 as uuidv4 } from 'uuid';

export interface GatewayChargeInput {
  paymentId: number;
  amount: number;
}

export interface GatewayChargeResult {
  referenceId: string;
  status: 'SUCCESS' | 'FAILED';
}

type GatewayOutcome = 'success' | 'failure' | 'timeout';

@Injectable()
export class GatewayService {
  private readonly logger = new Logger(GatewayService.name);

  constructor(private readonly httpService: HttpService) {}

  /**
   * Simulates an external payment gateway.
   *
   * Outcome distribution (randomly selected):
   *  - 50% → Success (with a 200ms–1500ms delay)
   *  - 30% → Failure (with a 100ms–800ms delay)
   *  - 20% → Timeout (simulates 5s+ response, throws GatewayTimeoutError)
   */
  async charge(input: GatewayChargeInput): Promise<GatewayChargeResult> {
    const outcome = this.pickOutcome();
    const delay = this.randomDelay(outcome);

    this.logger.log(
      `[GATEWAY] paymentId=${input.paymentId} | outcome=${outcome} | simulatedDelay=${delay}ms`,
    );

    await this.sleep(delay);

    if (outcome === 'timeout') {
      this.logger.warn(
        `[GATEWAY_TIMEOUT] paymentId=${input.paymentId} | exceeded ${delay}ms`,
      );
      throw new Error(`Gateway timeout after ${delay}ms for paymentId=${input.paymentId}`);
    }

    if (outcome === 'failure') {
      this.logger.warn(
        `[GATEWAY_FAILURE] paymentId=${input.paymentId} | simulated gateway rejection`,
      );
      throw new Error(`Gateway returned failure for paymentId=${input.paymentId}`);
    }

    // ─── Success path ──────────────────────────────────────────────────────
    const referenceId = `GW-${uuidv4().substring(0, 8).toUpperCase()}`;

    this.logger.log(
      `[GATEWAY_SUCCESS] paymentId=${input.paymentId} | referenceId=${referenceId}`,
    );

    // Asynchronously fire a webhook callback to simulate real gateway behavior.
    // We do NOT await this — it simulates a delayed, async callback from the gateway.
    void this.fireWebhookCallback(input.paymentId, referenceId);

    return { referenceId, status: 'SUCCESS' };
  }

  /**
   * Fires a simulated webhook to our own endpoint as a real gateway would do.
   * This is intentionally async (no await) to simulate asynchronous delivery.
   */
  private async fireWebhookCallback(
    paymentId: number,
    referenceId: string,
  ): Promise<void> {
    // Random delay before webhook fires, simulating network latency
    const webhookDelay = this.randomBetween(100, 2000);
    await this.sleep(webhookDelay);

    const payload = {
      eventId: `EVT-${uuidv4()}`,
      eventType: 'payment.success',
      paymentId,
      referenceId,
      status: 'SUCCESS',
      timestamp: new Date().toISOString(),
    };

    const port = process.env.PORT || 3000;
    const url = `http://localhost:${port}/webhooks/gateway`;

    try {
      await firstValueFrom(
        this.httpService.post(url, payload, {
          headers: { 'x-gateway-signature': 'simulated-signature' },
          timeout: 5000,
        }),
      );
      this.logger.log(
        `[WEBHOOK_FIRED] paymentId=${paymentId} | eventId=${payload.eventId} | delay=${webhookDelay}ms`,
      );
    } catch (err) {
      this.logger.warn(
        `[WEBHOOK_FIRE_FAILED] Could not deliver webhook | paymentId=${paymentId} | error=${(err as Error).message}`,
      );
    }
  }

  private pickOutcome(): GatewayOutcome {
    const rand = Math.random();
    if (rand < 0.5) return 'success';   // 50%
    if (rand < 0.8) return 'failure';   // 30%
    return 'timeout';                    // 20%
  }

  private randomDelay(outcome: GatewayOutcome): number {
    switch (outcome) {
      case 'success':  return this.randomBetween(200, 1500);
      case 'failure':  return this.randomBetween(100, 800);
      case 'timeout':  return this.randomBetween(5000, 8000);
    }
  }

  private randomBetween(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
