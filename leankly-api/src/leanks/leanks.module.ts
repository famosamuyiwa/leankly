import { Module } from "@nestjs/common";
import { EntitlementsModule } from "../entitlements/entitlements.module";
import { MediaModule } from "../media/media.module";
import { RealtimeModule } from "../realtime/realtime.module";
import { LeanksController } from "./leanks.controller";
import { LeanksService } from "./leanks.service";

@Module({
  imports: [MediaModule, RealtimeModule, EntitlementsModule],
  controllers: [LeanksController],
  providers: [LeanksService],
  exports: [LeanksService],
})
export class LeanksModule {}
