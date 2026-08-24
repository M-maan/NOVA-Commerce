CREATE TYPE "CheckoutStatus" AS ENUM ('ACTIVE', 'PAYMENT_PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'EXPIRED');
CREATE TYPE "ShippingMethodStatus" AS ENUM ('ACTIVE', 'INACTIVE');
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'REQUIRES_ACTION', 'PROCESSING', 'SUCCEEDED', 'FAILED', 'CANCELLED', 'REFUNDED', 'PARTIALLY_REFUNDED');

CREATE TABLE "shipping_methods" (
  "id" TEXT NOT NULL, "uuid" TEXT NOT NULL, "name" TEXT NOT NULL, "code" TEXT NOT NULL,
  "description" TEXT, "price" DECIMAL(12,2) NOT NULL, "estimated_days" INTEGER NOT NULL,
  "status" "ShippingMethodStatus" NOT NULL DEFAULT 'ACTIVE', "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL, CONSTRAINT "shipping_methods_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "checkout_sessions" (
  "id" TEXT NOT NULL, "uuid" TEXT NOT NULL, "user_id" TEXT NOT NULL, "cart_id" TEXT NOT NULL,
  "status" "CheckoutStatus" NOT NULL DEFAULT 'ACTIVE', "currency" TEXT NOT NULL DEFAULT 'USD',
  "subtotal" DECIMAL(12,2) NOT NULL, "discount_total" DECIMAL(12,2) NOT NULL, "shipping_total" DECIMAL(12,2) NOT NULL,
  "tax_total" DECIMAL(12,2) NOT NULL, "grand_total" DECIMAL(12,2) NOT NULL, "shipping_address" JSONB NOT NULL,
  "billing_address" JSONB, "shipping_method_id" TEXT, "expires_at" TIMESTAMP(3) NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "checkout_sessions_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "payments" (
  "id" TEXT NOT NULL, "uuid" TEXT NOT NULL, "user_id" TEXT NOT NULL, "checkout_session_id" TEXT NOT NULL,
  "order_id" TEXT, "provider" TEXT NOT NULL DEFAULT 'stripe', "provider_payment_id" TEXT,
  "amount" DECIMAL(12,2) NOT NULL, "currency" TEXT NOT NULL DEFAULT 'USD', "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
  "payment_method" TEXT, "failure_reason" TEXT, "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL, CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "payment_events" (
  "id" TEXT NOT NULL, "payment_id" TEXT NOT NULL, "provider_event_id" TEXT NOT NULL, "event_type" TEXT NOT NULL,
  "status" TEXT NOT NULL, "processed_at" TIMESTAMP(3), "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "payment_events_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "shipping_methods_uuid_key" ON "shipping_methods"("uuid");
CREATE UNIQUE INDEX "shipping_methods_code_key" ON "shipping_methods"("code");
CREATE INDEX "shipping_methods_status_idx" ON "shipping_methods"("status");
CREATE UNIQUE INDEX "checkout_sessions_uuid_key" ON "checkout_sessions"("uuid");
CREATE INDEX "checkout_sessions_user_id_status_idx" ON "checkout_sessions"("user_id", "status");
CREATE INDEX "checkout_sessions_expires_at_status_idx" ON "checkout_sessions"("expires_at", "status");
CREATE UNIQUE INDEX "payments_uuid_key" ON "payments"("uuid");
CREATE UNIQUE INDEX "payments_provider_payment_id_key" ON "payments"("provider_payment_id");
CREATE INDEX "payments_user_id_status_idx" ON "payments"("user_id", "status");
CREATE INDEX "payments_checkout_session_id_idx" ON "payments"("checkout_session_id");
CREATE UNIQUE INDEX "payment_events_provider_event_id_key" ON "payment_events"("provider_event_id");
CREATE INDEX "payment_events_payment_id_created_at_idx" ON "payment_events"("payment_id", "created_at");
ALTER TABLE "checkout_sessions" ADD CONSTRAINT "checkout_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "checkout_sessions" ADD CONSTRAINT "checkout_sessions_cart_id_fkey" FOREIGN KEY ("cart_id") REFERENCES "carts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "checkout_sessions" ADD CONSTRAINT "checkout_sessions_shipping_method_id_fkey" FOREIGN KEY ("shipping_method_id") REFERENCES "shipping_methods"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "payments" ADD CONSTRAINT "payments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "payments" ADD CONSTRAINT "payments_checkout_session_id_fkey" FOREIGN KEY ("checkout_session_id") REFERENCES "checkout_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "payment_events" ADD CONSTRAINT "payment_events_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "payments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
