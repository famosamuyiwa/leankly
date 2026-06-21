import { Module } from "@nestjs/common";
import { RevenueCatService } from "./revenuecat.service";
import { WebhooksController } from "./webhooks.controller";

@Module({
  controllers: [WebhooksController],
  providers: [RevenueCatService],
})
export class WebhooksModule {}
