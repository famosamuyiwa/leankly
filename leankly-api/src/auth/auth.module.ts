import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { AppwriteAuthGuard } from "./appwrite-auth.guard";
import { AppwriteService } from "./appwrite.service";
import { RolesGuard } from "./roles.guard";
import { RateLimitGuard } from "../common/rate-limit.guard";

@Module({
  providers: [
    AppwriteService,
    { provide: APP_GUARD, useClass: AppwriteAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_GUARD, useClass: RateLimitGuard },
  ],
  exports: [AppwriteService],
})
export class AuthModule {}
