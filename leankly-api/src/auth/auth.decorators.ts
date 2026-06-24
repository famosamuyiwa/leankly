import {
  createParamDecorator,
  ExecutionContext,
  SetMetadata,
} from "@nestjs/common";
import { User } from "@prisma/client";
import { UserRole } from "@prisma/client";
import { PERMISSIONS_KEY } from "./permissions.guard";
import { UserPermission } from "./permissions";
import { ROLES_KEY } from "./roles.guard";

export const IS_PUBLIC_KEY = "isPublic";
export const ALLOW_UNVERIFIED_KEY = "allowUnverified";

export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
export const AllowUnverified = () => SetMetadata(ALLOW_UNVERIFIED_KEY, true);
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
export const Permissions = (...permissions: UserPermission[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);

export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): User =>
    context.switchToHttp().getRequest<Express.Request>().currentUser,
);
