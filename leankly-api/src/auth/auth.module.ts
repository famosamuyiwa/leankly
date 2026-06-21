import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { AppwriteAuthGuard } from "./appwrite-auth.guard";
import { AppwriteService } from "./appwrite.service";

@Module({
  providers: [
    AppwriteService,
    { provide: APP_GUARD, useClass: AppwriteAuthGuard },
  ],
  exports: [AppwriteService],
})
export class AuthModule {}
