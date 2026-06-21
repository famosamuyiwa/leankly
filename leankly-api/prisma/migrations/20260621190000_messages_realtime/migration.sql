CREATE TYPE "MessageType" AS ENUM ('USER', 'SYSTEM');

CREATE TABLE "messages" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "leank_id" UUID NOT NULL,
  "sender_id" UUID,
  "sender_name" TEXT NOT NULL,
  "sender_photo" TEXT,
  "content" TEXT NOT NULL,
  "type" "MessageType" NOT NULL DEFAULT 'USER',
  "reply_to_id" UUID,
  "reply_to_content" TEXT,
  "reply_to_sender" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "user_chat_meta" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "leank_id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "read_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "user_chat_meta_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "messages_leank_id_created_at_id_idx" ON "messages"("leank_id", "created_at", "id");
CREATE INDEX "messages_sender_id_created_at_idx" ON "messages"("sender_id", "created_at");
CREATE UNIQUE INDEX "user_chat_meta_leank_id_user_id_key" ON "user_chat_meta"("leank_id", "user_id");
CREATE INDEX "user_chat_meta_user_id_read_at_idx" ON "user_chat_meta"("user_id", "read_at");

ALTER TABLE "messages" ADD CONSTRAINT "messages_leank_id_fkey" FOREIGN KEY ("leank_id") REFERENCES "leanks"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "messages" ADD CONSTRAINT "messages_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "messages" ADD CONSTRAINT "messages_reply_to_id_fkey" FOREIGN KEY ("reply_to_id") REFERENCES "messages"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "leanks" ADD CONSTRAINT "leanks_last_message_id_fkey" FOREIGN KEY ("last_message_id") REFERENCES "messages"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "user_chat_meta" ADD CONSTRAINT "user_chat_meta_leank_id_fkey" FOREIGN KEY ("leank_id") REFERENCES "leanks"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "user_chat_meta" ADD CONSTRAINT "user_chat_meta_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
