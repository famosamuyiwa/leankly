import { INestApplicationContext } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { IoAdapter } from "@nestjs/platform-socket.io";
import { createAdapter } from "@socket.io/redis-adapter";
import IORedis from "ioredis";
import { Server, ServerOptions } from "socket.io";

export class RedisIoAdapter extends IoAdapter {
  private adapterConstructor?: ReturnType<typeof createAdapter>;

  constructor(private readonly context: INestApplicationContext) {
    super(context);
  }

  async connect() {
    const url = this.context.get(ConfigService).getOrThrow<string>("REDIS_URL");
    const publisher = new IORedis(url);
    const subscriber = publisher.duplicate();
    await Promise.all([
      publisher.status === "ready"
        ? Promise.resolve()
        : new Promise<void>((resolve) => publisher.once("ready", resolve)),
      subscriber.status === "ready"
        ? Promise.resolve()
        : new Promise<void>((resolve) => subscriber.once("ready", resolve)),
    ]);
    this.adapterConstructor = createAdapter(publisher, subscriber);
  }

  createIOServer(port: number, options?: ServerOptions) {
    const server = super.createIOServer(port, options) as Server;
    if (this.adapterConstructor) server.adapter(this.adapterConstructor);
    return server;
  }
}
