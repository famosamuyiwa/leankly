CREATE TYPE "UsageFeature" AS ENUM ('INTEREST', 'UNDO');

ALTER TABLE "users" ADD CONSTRAINT "users_referred_by_id_fkey"
  FOREIGN KEY ("referred_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "blocks" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "blocker_id" UUID NOT NULL,
  "blocked_id" UUID NOT NULL, "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "blocks_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "reports" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "reporter_id" UUID NOT NULL,
  "reported_id" UUID NOT NULL, "reason" TEXT NOT NULL, "notes" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "reports_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "referrals" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "referrer_id" UUID NOT NULL,
  "referred_id" UUID NOT NULL, "code" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "referrals_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "daily_usage" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "user_id" UUID NOT NULL,
  "feature" "UsageFeature" NOT NULL, "usage_date" DATE NOT NULL,
  "count" INTEGER NOT NULL DEFAULT 0, "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL, CONSTRAINT "daily_usage_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "user_entitlements" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "user_id" UUID NOT NULL,
  "is_pro" BOOLEAN NOT NULL DEFAULT false, "expires_at" TIMESTAMP(3),
  "last_event_at" TIMESTAMP(3), "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL, CONSTRAINT "user_entitlements_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "blocks_blocker_id_blocked_id_key" ON "blocks"("blocker_id", "blocked_id");
CREATE INDEX "blocks_blocked_id_idx" ON "blocks"("blocked_id");
CREATE INDEX "reports_reported_id_created_at_idx" ON "reports"("reported_id", "created_at");
CREATE INDEX "reports_reporter_id_created_at_idx" ON "reports"("reporter_id", "created_at");
CREATE UNIQUE INDEX "referrals_referred_id_key" ON "referrals"("referred_id");
CREATE UNIQUE INDEX "referrals_referrer_id_referred_id_key" ON "referrals"("referrer_id", "referred_id");
CREATE UNIQUE INDEX "daily_usage_user_id_feature_usage_date_key" ON "daily_usage"("user_id", "feature", "usage_date");
CREATE UNIQUE INDEX "user_entitlements_user_id_key" ON "user_entitlements"("user_id");

ALTER TABLE "blocks" ADD CONSTRAINT "blocks_blocker_id_fkey" FOREIGN KEY ("blocker_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "blocks" ADD CONSTRAINT "blocks_blocked_id_fkey" FOREIGN KEY ("blocked_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "reports" ADD CONSTRAINT "reports_reporter_id_fkey" FOREIGN KEY ("reporter_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "reports" ADD CONSTRAINT "reports_reported_id_fkey" FOREIGN KEY ("reported_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_referrer_id_fkey" FOREIGN KEY ("referrer_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_referred_id_fkey" FOREIGN KEY ("referred_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "daily_usage" ADD CONSTRAINT "daily_usage_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "user_entitlements" ADD CONSTRAINT "user_entitlements_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
