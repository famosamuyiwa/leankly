CREATE TYPE "LeankStatus" AS ENUM ('Active', 'Completed', 'Canceled');
CREATE TYPE "LeankCategory" AS ENUM ('Fitness & Sports', 'Study & Learning', 'Social & Nightlife', 'Volunteering & Causes', 'Health & Wellness', 'Creative & Arts', 'Food & Drinks', 'Travel & Outdoors', 'Career & Networking', 'Gaming & Esports', 'Other');
CREATE TYPE "ReactionStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED');

CREATE TABLE "leanks" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "owner_id" UUID NOT NULL,
  "title" TEXT NOT NULL, "description" TEXT NOT NULL DEFAULT '', "cover_url" TEXT NOT NULL,
  "cover_file_id" TEXT, "status" "LeankStatus" NOT NULL DEFAULT 'Active',
  "category" "LeankCategory" NOT NULL DEFAULT 'Other', "event_date" DATE NOT NULL,
  "time" TEXT NOT NULL DEFAULT '', "location" TEXT NOT NULL, "location_lat" DOUBLE PRECISION,
  "location_lng" DOUBLE PRECISION, "is_online" BOOLEAN NOT NULL DEFAULT false,
  "people_required" INTEGER NOT NULL DEFAULT 1, "last_message_id" UUID, "last_message_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "leanks_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "participants" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "leank_id" UUID NOT NULL, "user_id" UUID NOT NULL,
  "joined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "participants_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "reactions" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "user_id" UUID NOT NULL, "leank_id" UUID NOT NULL,
  "is_liked" BOOLEAN NOT NULL, "status" "ReactionStatus" NOT NULL DEFAULT 'PENDING',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "reactions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "leanks_status_created_at_id_idx" ON "leanks"("status", "created_at", "id");
CREATE INDEX "leanks_owner_id_created_at_idx" ON "leanks"("owner_id", "created_at");
CREATE INDEX "leanks_event_date_status_idx" ON "leanks"("event_date", "status");
CREATE INDEX "leanks_category_status_idx" ON "leanks"("category", "status");
CREATE INDEX "leanks_location_lat_location_lng_idx" ON "leanks"("location_lat", "location_lng");
CREATE UNIQUE INDEX "participants_leank_id_user_id_key" ON "participants"("leank_id", "user_id");
CREATE INDEX "participants_user_id_joined_at_idx" ON "participants"("user_id", "joined_at");
CREATE UNIQUE INDEX "reactions_user_id_leank_id_key" ON "reactions"("user_id", "leank_id");
CREATE INDEX "reactions_leank_id_is_liked_status_created_at_idx" ON "reactions"("leank_id", "is_liked", "status", "created_at");

ALTER TABLE "leanks" ADD CONSTRAINT "leanks_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "participants" ADD CONSTRAINT "participants_leank_id_fkey" FOREIGN KEY ("leank_id") REFERENCES "leanks"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "participants" ADD CONSTRAINT "participants_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "reactions" ADD CONSTRAINT "reactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "reactions" ADD CONSTRAINT "reactions_leank_id_fkey" FOREIGN KEY ("leank_id") REFERENCES "leanks"("id") ON DELETE CASCADE ON UPDATE CASCADE;
