import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { AppwriteAdminService } from "./appwrite/appwrite-admin.service";
import { ClassificationProcessor } from "./jobs/classification.processor";
import { JobsModule } from "./jobs/jobs.module";
import { PushProcessor } from "./jobs/push.processor";
import { PrismaModule } from "./prisma/prisma.module";

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), PrismaModule, JobsModule],
  providers: [AppwriteAdminService, ClassificationProcessor, PushProcessor],
})
export class WorkerModule {}
