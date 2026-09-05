import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { InventoryService } from './inventory.service';

@Injectable()
export class InventoryExpiryProcessor implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(InventoryExpiryProcessor.name);
  private timer?: NodeJS.Timeout;
  private running = false;

  constructor(private readonly inventory: InventoryService) {}

  onModuleInit() {
    this.timer = setInterval(() => void this.expireReservations(), 60_000);
    this.timer.unref();
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  private async expireReservations() {
    if (this.running) return;
    this.running = true;
    try {
      await this.inventory.expire();
    } catch (error) {
      this.logger.error('Failed to expire inventory reservations', error instanceof Error ? error.stack : undefined);
    } finally {
      this.running = false;
    }
  }
}
