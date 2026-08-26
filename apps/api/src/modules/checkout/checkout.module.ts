import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { InventoryModule } from '../inventory/inventory.module';
import { CheckoutController } from './checkout.controller';
import { CheckoutService } from './checkout.service';

@Module({ imports: [DatabaseModule, InventoryModule], controllers: [CheckoutController], providers: [CheckoutService], exports: [CheckoutService] })
export class CheckoutModule {}
