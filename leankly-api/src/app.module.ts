import { MiddlewareConsumer, Module, NestModule } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { HealthModule } from "./health/health.module";
import { PrismaModule } from "./prisma/prisma.module";
import { RedisModule } from "./redis/redis.module";
import { RequestIdMiddleware } from "./common/request-id.middleware";
import { AuthModule } from "./auth/auth.module";
import { UsersModule } from "./users/users.module";
import { ModerationModule } from "./moderation/moderation.module";
import { ReferralsModule } from "./referrals/referrals.module";
import { UsageModule } from "./usage/usage.module";
import { JobsModule } from "./jobs/jobs.module";
import { MediaModule } from "./media/media.module";
import { LeanksModule } from "./leanks/leanks.module";
import { ReactionsModule } from "./reactions/reactions.module";
import { MessagesModule } from "./messages/messages.module";
import { EntitlementsModule } from "./entitlements/entitlements.module";
import { WebhooksModule } from "./webhooks/webhooks.module";
import { AdminModule } from "./admin/admin.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    RedisModule,
    AuthModule,
    HealthModule,
    UsersModule,
    ModerationModule,
    ReferralsModule,
    UsageModule,
    JobsModule,
    MediaModule,
    LeanksModule,
    ReactionsModule,
    MessagesModule,
    EntitlementsModule,
    WebhooksModule,
    AdminModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestIdMiddleware).forRoutes("*");
  }
}
