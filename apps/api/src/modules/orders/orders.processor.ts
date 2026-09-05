import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { OrdersService } from './orders.service';

/**
 * Order lifecycle jobs are deliberately provider-agnostic. They keep return
 * windows and Stripe refund state consistent even when no admin is online.
 */
@Injectable()
export class OrdersProcessor implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(OrdersProcessor.name);
  private readonly timers: NodeJS.Timeout[] = [];
  private syncingRefunds = false;
  private expiringReturns = false;

  constructor(private readonly orders: OrdersService) {}

  onModuleInit() {
    this.timers.push(setInterval(() => void this.syncRefunds(), 5 * 60_000));
    this.timers.push(setInterval(() => void this.expireReturns(), 60 * 60_000));
    this.timers.forEach((timer) => timer.unref());
  }

  onModuleDestroy() {
    this.timers.forEach((timer) => clearInterval(timer));
  }

  private async syncRefunds() {
    if (this.syncingRefunds) return;
    this.syncingRefunds = true;
    try {
      await this.orders.syncRefunds();
    } catch (error) {
      this.logger.error('Failed to sync Stripe refunds', error instanceof Error ? error.stack : undefined);
    } finally {
      this.syncingRefunds = false;
    }
  }

  private async expireReturns() {
    if (this.expiringReturns) return;
    this.expiringReturns = true;
    try {
      await this.orders.expireReturns();
    } catch (error) {
      this.logger.error('Failed to expire return requests', error instanceof Error ? error.stack : undefined);
    } finally {
      this.expiringReturns = false;
    }
  }
}
