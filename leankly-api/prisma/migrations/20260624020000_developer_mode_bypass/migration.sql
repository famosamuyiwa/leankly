ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'QA';
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'DEV';

ALTER TABLE "user_entitlements"
  ADD COLUMN "developer_mode_enabled" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "developer_mode_updated_at" TIMESTAMP(3);
