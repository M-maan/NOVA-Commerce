-- Milestone 11 production hardening indexes.
-- These are additive and safe for existing data.

CREATE INDEX IF NOT EXISTS "promotions_status_starts_at_ends_at_idx"
ON "promotions"("status", "starts_at", "ends_at");

CREATE INDEX IF NOT EXISTS "coupons_promotion_id_idx"
ON "coupons"("promotion_id");

CREATE INDEX IF NOT EXISTS "coupons_status_starts_at_expires_at_idx"
ON "coupons"("status", "starts_at", "expires_at");

CREATE INDEX IF NOT EXISTS "inventory_levels_quantity_available_idx"
ON "inventory_levels"("quantity_available");

CREATE INDEX IF NOT EXISTS "orders_created_at_idx"
ON "orders"("created_at");

CREATE INDEX IF NOT EXISTS "orders_status_created_at_idx"
ON "orders"("status", "created_at");

CREATE INDEX IF NOT EXISTS "orders_email_idx"
ON "orders"("email");
