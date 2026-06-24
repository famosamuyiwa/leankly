import { Module } from "@nestjs/common";
import { EntitlementsModule } from "../entitlements/entitlements.module";
import { UsageController } from "./usage.controller";
import { UsageService } from "./usage.service";

@Module({
  imports: [EntitlementsModule],
  controllers: [UsageController],
  providers: [UsageService],
  exports: [UsageService],
})
export class UsageModule {}
