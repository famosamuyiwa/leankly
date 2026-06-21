import { BullModule } from "@nestjs/bullmq";
import { Global, Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { CLASSIFICATION_QUEUE, PUSH_QUEUE } from "./jobs.constants";
import { JobsService } from "./jobs.service";

@Global()
@Module({
  imports: [
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const url = new URL(config.getOrThrow<string>("REDIS_URL"));
        return {
          connection: {
            host: url.hostname,
            port: Number(url.port || 6379),
            username: url.username || undefined,
            password: url.password || undefined,
            tls: url.protocol === "rediss:" ? {} : undefined,
          },
        };
      },
    }),
    BullModule.registerQueue(
      { name: CLASSIFICATION_QUEUE },
      { name: PUSH_QUEUE },
    ),
  ],
  providers: [JobsService],
  exports: [JobsService],
})
export class JobsModule {}
