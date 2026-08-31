import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { RedisModule } from '../../redis/redis.module';
import { HealthController } from './health.controller';

@Module({ imports: [DatabaseModule, RedisModule], controllers: [HealthController] })
export class HealthModule {}
