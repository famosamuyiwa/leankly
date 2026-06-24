import { Module } from "@nestjs/common";
import { EntitlementsModule } from "../entitlements/entitlements.module";
import { RealtimeModule } from "../realtime/realtime.module";
import { ReactionsController } from "./reactions.controller";
import { ReactionsService } from "./reactions.service";

@Module({
  imports: [RealtimeModule, EntitlementsModule],
  controllers: [ReactionsController],
  providers: [ReactionsService],
  exports: [ReactionsService],
})
export class ReactionsModule {}
