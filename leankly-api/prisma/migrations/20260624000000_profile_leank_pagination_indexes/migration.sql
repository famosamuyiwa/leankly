DROP INDEX "leanks_owner_id_created_at_idx";

CREATE INDEX "leanks_owner_id_created_at_id_idx" ON "leanks"("owner_id", "created_at", "id");

CREATE INDEX "participants_user_id_leank_id_idx" ON "participants"("user_id", "leank_id");
