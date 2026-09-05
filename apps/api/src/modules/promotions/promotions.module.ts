import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { PromotionsController } from './promotions.controller';
import { PromotionsService } from './promotions.service';
@Module({ imports: [DatabaseModule], controllers: [PromotionsController], providers: [PromotionsService] })
export class PromotionsModule {}
