import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { ReviewsController, AdminReviewsController } from './reviews.controller';
import { ReviewsService } from './reviews.service';

@Module({ imports: [DatabaseModule], controllers: [ReviewsController, AdminReviewsController], providers: [ReviewsService], exports: [ReviewsService] })
export class ReviewsModule {}
