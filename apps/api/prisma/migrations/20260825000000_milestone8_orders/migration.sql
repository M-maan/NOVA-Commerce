-- Milestone 8: post-purchase order lifecycle
CREATE TYPE "OrderStatus" AS ENUM ('PENDING', 'CONFIRMED', 'PROCESSING', 'PACKED', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'RETURN_REQUESTED', 'RETURNED', 'REFUNDED');
CREATE TYPE "FulfillmentStatus" AS ENUM ('UNFULFILLED', 'PROCESSING', 'PACKED', 'SHIPPED', 'DELIVERED', 'RETURNED');
CREATE TYPE "ShipmentStatus" AS ENUM ('PENDING', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'FAILED');
CREATE TYPE "ReturnStatus" AS ENUM ('REQUESTED', 'APPROVED', 'REJECTED', 'RECEIVED', 'COMPLETED', 'CANCELLED');
CREATE TYPE "RefundStatus" AS ENUM ('PENDING', 'PROCESSING', 'SUCCEEDED', 'FAILED', 'CANCELLED');

CREATE TABLE "orders" (
  "id" TEXT NOT NULL,
  "uuid" TEXT NOT NULL,
  "order_number" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "checkout_session_id" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "phone" TEXT,
  "status" "OrderStatus" NOT NULL DEFAULT 'PENDING',
  "payment_status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
  "fulfillment_status" "FulfillmentStatus" NOT NULL DEFAULT 'UNFULFILLED',
  "currency" TEXT NOT NULL DEFAULT 'USD',
  "subtotal" DECIMAL(12,2) NOT NULL,
  "discount_total" DECIMAL(12,2) NOT NULL,
  "shipping_total" DECIMAL(12,2) NOT NULL,
  "tax_total" DECIMAL(12,2) NOT NULL,
  "grand_total" DECIMAL(12,2) NOT NULL,
  "coupon_code" TEXT,
  "shipping_address_snapshot" JSONB NOT NULL,
  "billing_address_snapshot" JSONB,
  "placed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "cancelled_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "orders_uuid_key" ON "orders"("uuid");
CREATE UNIQUE INDEX "orders_order_number_key" ON "orders"("order_number");
CREATE UNIQUE INDEX "orders_checkout_session_id_key" ON "orders"("checkout_session_id");
CREATE INDEX "orders_user_id_created_at_idx" ON "orders"("user_id", "created_at");
CREATE INDEX "orders_status_fulfillment_status_idx" ON "orders"("status", "fulfillment_status");

CREATE TABLE "order_items" (
  "id" TEXT NOT NULL,
  "order_id" TEXT NOT NULL,
  "product_id" TEXT NOT NULL,
  "variant_id" TEXT,
  "product_name_snapshot" TEXT NOT NULL,
  "variant_name_snapshot" TEXT,
  "sku_snapshot" TEXT,
  "image_snapshot" TEXT,
  "unit_price" DECIMAL(12,2) NOT NULL,
  "quantity" INTEGER NOT NULL,
  "line_total" DECIMAL(12,2) NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "order_items_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "order_items_order_id_idx" ON "order_items"("order_id");

CREATE TABLE "order_status_history" (
  "id" TEXT NOT NULL,
  "order_id" TEXT NOT NULL,
  "previous_status" "OrderStatus",
  "new_status" "OrderStatus" NOT NULL,
  "reason" TEXT,
  "changed_by" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "order_status_history_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "order_status_history_order_id_created_at_idx" ON "order_status_history"("order_id", "created_at");

CREATE TABLE "shipments" (
  "id" TEXT NOT NULL,
  "order_id" TEXT NOT NULL,
  "carrier" TEXT NOT NULL,
  "tracking_number" TEXT,
  "tracking_url" TEXT,
  "status" "ShipmentStatus" NOT NULL DEFAULT 'PENDING',
  "shipped_at" TIMESTAMP(3),
  "delivered_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "shipments_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "shipments_order_id_status_idx" ON "shipments"("order_id", "status");

CREATE TABLE "return_requests" (
  "id" TEXT NOT NULL,
  "order_id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "status" "ReturnStatus" NOT NULL DEFAULT 'REQUESTED',
  "reason" TEXT NOT NULL,
  "notes" TEXT,
  "requested_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "approved_at" TIMESTAMP(3),
  "rejected_at" TIMESTAMP(3),
  "completed_at" TIMESTAMP(3),
  CONSTRAINT "return_requests_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "return_requests_order_id_user_id_key" ON "return_requests"("order_id", "user_id");
CREATE INDEX "return_requests_status_requested_at_idx" ON "return_requests"("status", "requested_at");

CREATE TABLE "refunds" (
  "id" TEXT NOT NULL,
  "order_id" TEXT NOT NULL,
  "payment_id" TEXT NOT NULL,
  "amount" DECIMAL(12,2) NOT NULL,
  "reason" TEXT NOT NULL,
  "provider_refund_id" TEXT,
  "status" "RefundStatus" NOT NULL DEFAULT 'PENDING',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "refunds_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "refunds_provider_refund_id_key" ON "refunds"("provider_refund_id");
CREATE INDEX "refunds_order_id_status_idx" ON "refunds"("order_id", "status");

ALTER TABLE "orders" ADD CONSTRAINT "orders_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "orders" ADD CONSTRAINT "orders_checkout_session_id_fkey" FOREIGN KEY ("checkout_session_id") REFERENCES "checkout_sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "product_variants"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "order_status_history" ADD CONSTRAINT "order_status_history_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "shipments" ADD CONSTRAINT "shipments_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "return_requests" ADD CONSTRAINT "return_requests_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "return_requests" ADD CONSTRAINT "return_requests_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "payments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "payments" ADD CONSTRAINT "payments_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;
