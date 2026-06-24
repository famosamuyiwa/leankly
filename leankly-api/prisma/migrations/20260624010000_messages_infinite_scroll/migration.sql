ALTER TABLE "leanks" ADD COLUMN "last_activity_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

UPDATE "leanks"
SET "last_activity_at" = COALESCE("last_message_at", "updated_at", "created_at");

CREATE INDEX "leanks_status_last_activity_at_id_idx" ON "leanks"("status", "last_activity_at", "id");
CREATE INDEX "leanks_owner_id_last_activity_at_id_idx" ON "leanks"("owner_id", "last_activity_at", "id");
CREATE INDEX "reactions_status_is_liked_created_at_id_idx" ON "reactions"("status", "is_liked", "created_at", "id");
