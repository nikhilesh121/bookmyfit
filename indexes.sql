-- ============================================================
-- BookMyFit — Production Database Indexes
-- Run this AFTER initial deployment (schema already created by TypeORM synchronize).
-- Safe to re-run: all indexes use CREATE INDEX IF NOT EXISTS.
-- ============================================================

-- ============================================================
-- USERS
-- ============================================================
-- Phone and email are already UNIQUE via TypeORM @Index — no duplicates needed.
-- Referral code lookup
CREATE INDEX IF NOT EXISTS idx_users_referral_code    ON users (referral_code) WHERE referral_code IS NOT NULL;
-- Role-based filtering (admin listing gym_owners, etc.)
CREATE INDEX IF NOT EXISTS idx_users_role             ON users (role);
-- Active user filtering
CREATE INDEX IF NOT EXISTS idx_users_is_active        ON users (is_active);
-- Created at for time-based queries
CREATE INDEX IF NOT EXISTS idx_users_created_at       ON users (created_at DESC);

-- ============================================================
-- GYMS
-- ============================================================
-- Name and city already indexed via TypeORM @Index.
-- Status + city combo — most common admin/search filter
CREATE INDEX IF NOT EXISTS idx_gyms_status_city       ON gyms (status, city);
-- Owner lookup (gym owner dashboard)
CREATE INDEX IF NOT EXISTS idx_gyms_owner_id          ON gyms (owner_id) WHERE owner_id IS NOT NULL;
-- Rating descending — "top gyms" queries
CREATE INDEX IF NOT EXISTS idx_gyms_rating_desc       ON gyms (rating DESC);
-- Tier filtering
CREATE INDEX IF NOT EXISTS idx_gyms_tier              ON gyms (tier);
-- KYC status filtering (admin KYC review)
CREATE INDEX IF NOT EXISTS idx_gyms_kyc_status        ON gyms (kyc_status);
-- Geo bounding-box queries (lat/lng — upgrade to PostGIS GIST index when available)
CREATE INDEX IF NOT EXISTS idx_gyms_lat               ON gyms (lat);
CREATE INDEX IF NOT EXISTS idx_gyms_lng               ON gyms (lng);
CREATE INDEX IF NOT EXISTS idx_gyms_created_at        ON gyms (created_at DESC);

-- ============================================================
-- SUBSCRIPTIONS
-- ============================================================
-- userId + status — most frequent mobile query ("my active subscription")
CREATE INDEX IF NOT EXISTS idx_subs_user_status       ON subscriptions (user_id, status);
-- endDate already indexed via TypeORM — used for expiry jobs
-- Status alone for admin bulk queries
CREATE INDEX IF NOT EXISTS idx_subs_status            ON subscriptions (status);
-- Corporate subscriptions
CREATE INDEX IF NOT EXISTS idx_subs_corporate_id      ON subscriptions (corporate_id) WHERE corporate_id IS NOT NULL;
-- Payment ID lookups (webhook reconciliation)
CREATE INDEX IF NOT EXISTS idx_subs_razorpay_order    ON subscriptions (razorpay_order_id) WHERE razorpay_order_id IS NOT NULL;
-- Invoice number
CREATE INDEX IF NOT EXISTS idx_subs_invoice_number    ON subscriptions (invoice_number) WHERE invoice_number IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_subs_created_at        ON subscriptions (created_at DESC);

-- ============================================================
-- CHECKINS
-- ============================================================
-- userId + checkinTime and gymId + checkinTime already indexed via @Index on entity class.
-- qrToken already UNIQUE indexed.
-- Subscription lookup (for daily-limit check)
CREATE INDEX IF NOT EXISTS idx_checkins_subscription  ON checkins (subscription_id);
-- Status for fraud queries
CREATE INDEX IF NOT EXISTS idx_checkins_status        ON checkins (status);
-- Device fingerprinting
CREATE INDEX IF NOT EXISTS idx_checkins_device_id     ON checkins (device_id) WHERE device_id IS NOT NULL;

-- ============================================================
-- FRAUD ALERTS
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_fraud_user_id          ON fraud_alerts (user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_fraud_gym_id           ON fraud_alerts (gym_id) WHERE gym_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_fraud_status           ON fraud_alerts (status);
CREATE INDEX IF NOT EXISTS idx_fraud_event_type       ON fraud_alerts (event_type);
CREATE INDEX IF NOT EXISTS idx_fraud_created_at       ON fraud_alerts (created_at DESC);

-- ============================================================
-- NOTIFICATIONS
-- ============================================================
-- userId already indexed via TypeORM.
-- Unread notifications per user (most common query)
CREATE INDEX IF NOT EXISTS idx_notif_user_unread      ON notifications (user_id, is_read) WHERE is_read = false;
CREATE INDEX IF NOT EXISTS idx_notif_created_at       ON notifications (created_at DESC);

-- ============================================================
-- RATINGS
-- ============================================================
-- userId already indexed.
CREATE INDEX IF NOT EXISTS idx_ratings_gym_id         ON ratings (gym_id) WHERE gym_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ratings_trainer_id     ON ratings (trainer_id) WHERE trainer_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ratings_wellness_id    ON ratings (wellness_partner_id) WHERE wellness_partner_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ratings_status         ON ratings (status);
CREATE INDEX IF NOT EXISTS idx_ratings_created_at     ON ratings (created_at DESC);

-- ============================================================
-- COUPONS
-- ============================================================
-- code already UNIQUE indexed.
-- Active coupons that haven't expired
CREATE INDEX IF NOT EXISTS idx_coupons_active_valid   ON coupons (is_active, valid_to) WHERE is_active = true;

-- ============================================================
-- PRODUCTS (store)
-- ============================================================
-- name and category already have indexes.
CREATE INDEX IF NOT EXISTS idx_products_active        ON products (is_active);
CREATE INDEX IF NOT EXISTS idx_products_stock         ON products (stock);
CREATE INDEX IF NOT EXISTS idx_products_category      ON products (category);

-- ============================================================
-- ORDERS (store)
-- ============================================================
-- userId already indexed.
CREATE INDEX IF NOT EXISTS idx_orders_status          ON orders (status);
CREATE INDEX IF NOT EXISTS idx_orders_cashfree        ON orders (cashfree_order_id) WHERE cashfree_order_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_orders_created_at      ON orders (created_at DESC);

-- ============================================================
-- TRAINERS
-- ============================================================
-- gymId already indexed.
CREATE INDEX IF NOT EXISTS idx_trainers_active        ON trainers (is_active);
CREATE INDEX IF NOT EXISTS idx_trainers_rating        ON trainers (rating DESC);

-- ============================================================
-- TRAINER BOOKINGS
-- ============================================================
-- userId and trainerId already indexed.
CREATE INDEX IF NOT EXISTS idx_trainer_bookings_gym   ON trainer_bookings (gym_id);
CREATE INDEX IF NOT EXISTS idx_trainer_bookings_status ON trainer_bookings (status);
CREATE INDEX IF NOT EXISTS idx_trainer_bookings_date  ON trainer_bookings (session_date DESC);

-- ============================================================
-- WELLNESS PARTNERS
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_wellness_city          ON wellness_partners (city);
CREATE INDEX IF NOT EXISTS idx_wellness_service_type  ON wellness_partners (service_type);
CREATE INDEX IF NOT EXISTS idx_wellness_status        ON wellness_partners (status);
CREATE INDEX IF NOT EXISTS idx_wellness_owner_id      ON wellness_partners (owner_id) WHERE owner_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_wellness_rating        ON wellness_partners (rating DESC);

-- ============================================================
-- WELLNESS SERVICES
-- ============================================================
-- partnerId already indexed.
CREATE INDEX IF NOT EXISTS idx_wellness_svc_active    ON wellness_services (is_active);

-- ============================================================
-- WELLNESS BOOKINGS
-- ============================================================
-- userId and partnerId already indexed.
CREATE INDEX IF NOT EXISTS idx_wellness_bk_service    ON wellness_bookings (service_id);
CREATE INDEX IF NOT EXISTS idx_wellness_bk_status     ON wellness_bookings (status);
CREATE INDEX IF NOT EXISTS idx_wellness_bk_date       ON wellness_bookings (booking_date DESC);

-- ============================================================
-- SETTLEMENTS
-- ============================================================
-- (gymId, month) already UNIQUE indexed.
CREATE INDEX IF NOT EXISTS idx_settlements_status     ON settlements (status);
CREATE INDEX IF NOT EXISTS idx_settlements_gym_id     ON settlements (gym_id);

-- ============================================================
-- CORPORATE ACCOUNTS
-- ============================================================
-- companyName and email already UNIQUE indexed.
CREATE INDEX IF NOT EXISTS idx_corporate_active       ON corporate_accounts (is_active);
CREATE INDEX IF NOT EXISTS idx_corporate_admin_user   ON corporate_accounts (admin_user_id) WHERE admin_user_id IS NOT NULL;

-- ============================================================
-- CORPORATE EMPLOYEES
-- ============================================================
-- (corporateId, userId) already UNIQUE indexed.
CREATE INDEX IF NOT EXISTS idx_corp_emp_user_id       ON corporate_employees (user_id);
CREATE INDEX IF NOT EXISTS idx_corp_emp_status        ON corporate_employees (status);
CREATE INDEX IF NOT EXISTS idx_corp_emp_emp_code      ON corporate_employees (employee_code);

-- ============================================================
-- GYM SLOTS
-- ============================================================
-- Most frequent query: slots for a gym on a specific date
CREATE INDEX IF NOT EXISTS idx_gym_slots_gym_date     ON gym_slots (gym_id, date);
CREATE INDEX IF NOT EXISTS idx_gym_slots_status       ON gym_slots (status);
CREATE INDEX IF NOT EXISTS idx_gym_slots_date         ON gym_slots (date);

-- ============================================================
-- SLOT BOOKINGS
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_slot_bookings_slot_id  ON slot_bookings (slot_id);
CREATE INDEX IF NOT EXISTS idx_slot_bookings_user_id  ON slot_bookings (user_id);
-- Prevent duplicate active bookings per user per slot
CREATE UNIQUE INDEX IF NOT EXISTS idx_slot_bookings_uniq
  ON slot_bookings (slot_id, user_id)
  WHERE status = 'confirmed';
CREATE INDEX IF NOT EXISTS idx_slot_bookings_gym_id   ON slot_bookings (gym_id);
CREATE INDEX IF NOT EXISTS idx_slot_bookings_created  ON slot_bookings (created_at DESC);

-- ============================================================
-- CATEGORIES & AMENITIES (small tables, full scan is fine)
-- Already have UNIQUE index on name via TypeORM.
-- ============================================================

-- ============================================================
-- WORKOUT VIDEOS
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_videos_category        ON workout_videos (category);
CREATE INDEX IF NOT EXISTS idx_videos_premium         ON workout_videos (is_premium);

-- ============================================================
-- Done.
-- To apply: psql $DATABASE_URL -f indexes.sql
-- Or via Neon console: paste contents and run.
-- ============================================================
