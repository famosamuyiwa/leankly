import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from "@nestjs/common";
import { Request } from "express";
import { RedisService } from "../redis/redis.service";

@Injectable()
export class RateLimitGuard implements CanActivate {
  constructor(private readonly redis: RedisService) {}

  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<Request>();
    const actor = request.currentUser?.id || request.ip || "unknown";
    const key = `rate:v1:${actor}:${Math.floor(Date.now() / 60_000)}`;
    try {
      if (this.redis.client.status === "wait")
        await this.redis.client.connect();
      const count = await this.redis.client.incr(key);
      if (count === 1) await this.redis.client.expire(key, 65);
      if (count > 120) {
        throw new HttpException(
          { code: "RATE_LIMITED", message: "Too many requests" },
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
    } catch (error) {
      if (error instanceof HttpException) throw error;
      // Availability wins if the cache is temporarily unavailable.
    }
    return true;
  }
}
