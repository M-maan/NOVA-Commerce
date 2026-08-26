import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from '../../database/database.module';
import { CheckoutModule } from '../checkout/checkout.module';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { OrdersModule } from '../orders/orders.module';

@Module({ imports: [DatabaseModule, ConfigModule, CheckoutModule, OrdersModule], controllers: [PaymentsController], providers: [PaymentsService] })
export class PaymentsModule {}
