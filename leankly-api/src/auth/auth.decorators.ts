import {
  createParamDecorator,
  ExecutionContext,
  SetMetadata,
} from "@nestjs/common";
import { User } from "@prisma/client";

export const IS_PUBLIC_KEY = "isPublic";
export const ALLOW_UNVERIFIED_KEY = "allowUnverified";

export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
export const AllowUnverified = () => SetMetadata(ALLOW_UNVERIFIED_KEY, true);

export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): User =>
    context.switchToHttp().getRequest<Express.Request>().currentUser,
);
