CREATE TYPE "UserRole" AS ENUM ('USER', 'ADMIN');

CREATE TABLE "users" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "appwrite_user_id" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "email_verified" BOOLEAN NOT NULL DEFAULT false,
  "name" TEXT NOT NULL,
  "avatar_url" TEXT,
  "avatar_file_id" TEXT,
  "age" INTEGER,
  "sex" TEXT,
  "location" TEXT,
  "location_lat" DOUBLE PRECISION,
  "location_lng" DOUBLE PRECISION,
  "push_target_id" TEXT,
  "push_provider_id" TEXT,
  "push_platform" TEXT,
  "push_enabled" BOOLEAN NOT NULL DEFAULT false,
  "role" "UserRole" NOT NULL DEFAULT 'USER',
  "referral_code" TEXT,
  "referral_count" INTEGER NOT NULL DEFAULT 0,
  "bonus_interests" INTEGER NOT NULL DEFAULT 0,
  "referred_by_id" UUID,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "suspended_at" TIMESTAMP(3),
  "deleted_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "users_appwrite_user_id_key" ON "users"("appwrite_user_id");
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
CREATE UNIQUE INDEX "users_referral_code_key" ON "users"("referral_code");
CREATE INDEX "users_is_active_deleted_at_idx" ON "users"("is_active", "deleted_at");
