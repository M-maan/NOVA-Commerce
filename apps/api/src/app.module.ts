import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { ThrottlerModule } from '@nestjs/throttler';
import * as Joi from 'joi';
import { HealthModule } from './modules/health/health.module';
import { DatabaseModule } from './database/database.module';
import { QueueModule } from './queue/queue.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { CatalogModule } from './modules/catalog/catalog.module';
import { DiscoveryModule } from './modules/discovery/discovery.module';
import { CartModule } from './modules/cart/cart.module';
import { WishlistModule } from './modules/wishlist/wishlist.module';
import { InventoryModule } from './modules/inventory/inventory.module';
import { CheckoutModule } from './modules/checkout/checkout.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { ShippingModule } from './modules/shipping/shipping.module';
import { OrdersModule } from './modules/orders/orders.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { ReviewsModule } from './modules/reviews/reviews.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { CustomersModule } from './modules/customers/customers.module';
import { PromotionsModule } from './modules/promotions/promotions.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      validationSchema: Joi.object({
        NODE_ENV: Joi.string().valid('development', 'test', 'production').default('development'),
        PORT: Joi.number().port().default(4000),
        API_PREFIX: Joi.string().default('api/v1'),
        DATABASE_URL: Joi.string().uri({ scheme: ['postgresql', 'postgres'] }).required(),
        REDIS_URL: Joi.string().uri({ scheme: ['redis', 'rediss'] }).required(),
        WEB_ORIGIN: Joi.string()
          .custom((value: string, helpers) => {
            const origins = value.split(',').map((origin) => origin.trim()).filter(Boolean);
            const invalid = origins.some((origin) => {
              try {
                new URL(origin);
                return false;
              } catch {
                return true;
              }
            });
            return origins.length && !invalid ? value : helpers.error('string.uri');
          })
          .required(),
        JWT_ACCESS_SECRET: Joi.string().min(32).required(),
        JWT_REFRESH_SECRET: Joi.string().min(32).required(),
        JWT_ACCESS_EXPIRES_IN: Joi.string().default('15m'),
        JWT_REFRESH_EXPIRES_IN_DAYS: Joi.number().integer().positive().default(30),
        STRIPE_SECRET_KEY: Joi.string().allow('').default(''),
        STRIPE_WEBHOOK_SECRET: Joi.string().allow('').default(''),
        STRIPE_PUBLISHABLE_KEY: Joi.string().allow('').default(''),
        CHECKOUT_TAX_RATE: Joi.number().min(0).max(1).default(0.1),
        RETURN_WINDOW_DAYS: Joi.number().integer().positive().default(30),
      }),
    }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 20 }]),
    BullModule.forRootAsync({ useFactory: (config: ConfigService) => ({ connection: { url: config.getOrThrow('REDIS_URL') } }), inject: [ConfigService] }),
    DatabaseModule,
    QueueModule,
    AuthModule,
    UsersModule,
    CatalogModule,
    DiscoveryModule,
    CartModule,
    WishlistModule,
    InventoryModule,
    CheckoutModule,
    PaymentsModule,
    ShippingModule,
    OrdersModule,
    NotificationsModule,
    ReviewsModule,
    AnalyticsModule,
    CustomersModule,
    PromotionsModule,
    HealthModule,
  ],
})
export class AppModule {}
