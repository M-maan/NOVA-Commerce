import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from '../../database/database.module';
import { CheckoutModule } from '../checkout/checkout.module';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';

@Module({ imports: [DatabaseModule, ConfigModule, CheckoutModule], controllers: [PaymentsController], providers: [PaymentsService] })
export class PaymentsModule {}
