import { OnModuleInit } from '@nestjs/common';
import { InjectQueue, Processor, WorkerHost } from '@nestjs/bullmq';
import { Job, Queue } from 'bullmq';
import { QUEUES } from '../../queue/queue.constants';
import { OrdersService } from './orders.service';

/**
 * Order lifecycle jobs are deliberately provider-agnostic. They keep return
 * windows and Stripe refund state consistent even when no admin is online.
 */
@Processor(QUEUES.ORDERS)
export class OrdersProcessor extends WorkerHost implements OnModuleInit {
  constructor(
    private readonly orders: OrdersService,
    @InjectQueue(QUEUES.ORDERS) private readonly queue: Queue,
  ) {
    super();
  }

  async onModuleInit() {
    await this.queue.add('expire-returns', {}, { repeat: { every: 60 * 60 * 1000 }, removeOnComplete: 100, removeOnFail: 100 });
    await this.queue.add('sync-refunds', {}, { repeat: { every: 5 * 60 * 1000 }, removeOnComplete: 100, removeOnFail: 100 });
  }

  async process(job: Job) {
    if (job.name === 'expire-returns') return this.orders.expireReturns();
    if (job.name === 'sync-refunds') return this.orders.syncRefunds();
    return { ignored: true, job: job.name };
  }
}
