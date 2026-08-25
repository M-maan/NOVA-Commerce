import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from '../../database/database.module';
import { InventoryModule } from '../inventory/inventory.module';
import { AdminOrdersController, OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { QUEUES } from '../../queue/queue.constants';
import { OrdersProcessor } from './orders.processor';

@Module({
  imports: [DatabaseModule, InventoryModule, ConfigModule, BullModule.registerQueue({ name: QUEUES.NOTIFICATIONS }), BullModule.registerQueue({ name: QUEUES.ORDERS })],
  controllers: [OrdersController, AdminOrdersController],
  providers: [OrdersService, OrdersProcessor],
  exports: [OrdersService],
})
export class OrdersModule {}
