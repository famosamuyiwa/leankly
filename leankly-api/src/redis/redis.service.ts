import { Injectable, OnModuleDestroy } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import IORedis from "ioredis";

@Injectable()
export class RedisService implements OnModuleDestroy {
  readonly client: IORedis;

  constructor(config: ConfigService) {
    this.client = new IORedis(config.getOrThrow<string>("REDIS_URL"), {
      maxRetriesPerRequest: null,
      lazyConnect: true,
    });
  }

  async ping() {
    if (this.client.status === "wait") await this.client.connect();
    return this.client.ping();
  }

  async onModuleDestroy() {
    if (this.client.status === "wait") {
      this.client.disconnect();
      return;
    }
    if (this.client.status !== "end") await this.client.quit();
  }
}
