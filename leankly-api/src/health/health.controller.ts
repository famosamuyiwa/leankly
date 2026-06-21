import { Controller, Get } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { RedisService } from "../redis/redis.service";

@Controller("health")
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  @Get()
  getHealth() {
    return {
      status: "ok",
      uptime: process.uptime(),
      version: process.env.npm_package_version || "1.0.0",
    };
  }

  @Get("db")
  async getDatabaseHealth() {
    await this.prisma.$queryRaw`SELECT 1`;
    return { status: "ok" };
  }

  @Get("redis")
  async getRedisHealth() {
    await this.redis.ping();
    return { status: "ok" };
  }
}
