CREATE TABLE "revenuecat_webhook_events" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "event_id" TEXT NOT NULL,
  "event_type" TEXT NOT NULL,
  "app_user_id" TEXT,
  "payload" JSONB NOT NULL,
  "processed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "revenuecat_webhook_events_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "revenuecat_webhook_events_event_id_key" ON "revenuecat_webhook_events"("event_id");
CREATE INDEX "revenuecat_webhook_events_app_user_id_processed_at_idx" ON "revenuecat_webhook_events"("app_user_id", "processed_at");
