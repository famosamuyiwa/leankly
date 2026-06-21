import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from "@nestjs/common";
import { Request, Response } from "express";

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<Response>();
    const request = host.switchToHttp().getRequest<Request>();
    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;
    const payload =
      exception instanceof HttpException ? exception.getResponse() : null;
    const objectPayload =
      payload && typeof payload === "object"
        ? (payload as Record<string, any>)
        : {};
    const message =
      typeof payload === "string"
        ? payload
        : Array.isArray(objectPayload.message)
          ? objectPayload.message.join(", ")
          : objectPayload.message || "Request failed";

    response.status(status).json({
      ok: false,
      error: {
        code: objectPayload.code || HttpStatus[status] || "API_ERROR",
        message,
        status,
        requestId: request.id,
      },
    });
  }
}
