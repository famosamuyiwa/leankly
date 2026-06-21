import { randomUUID } from "node:crypto";
import { Injectable, NestMiddleware } from "@nestjs/common";
import { NextFunction, Request, Response } from "express";

declare global {
  namespace Express {
    interface Request {
      id: string;
    }
  }
}

@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(request: Request, response: Response, next: NextFunction) {
    request.id = String(request.headers["x-request-id"] || randomUUID());
    response.setHeader("x-request-id", request.id);
    next();
  }
}
