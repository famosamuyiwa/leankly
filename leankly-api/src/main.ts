import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { configureApplication } from "./bootstrap";
import { RedisIoAdapter } from "./realtime/redis-io.adapter";

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  configureApplication(app);
  const realtimeAdapter = new RedisIoAdapter(app);
  await realtimeAdapter.connect();
  app.useWebSocketAdapter(realtimeAdapter);
  await app.listen(Number(process.env.PORT || 3000), "0.0.0.0");
}

void bootstrap();
