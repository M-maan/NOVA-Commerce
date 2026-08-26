import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { ShippingController } from './shipping.controller';
import { ShippingService } from './shipping.service';
@Module({ imports: [DatabaseModule], controllers: [ShippingController], providers: [ShippingService], exports: [ShippingService] })
export class ShippingModule {}
