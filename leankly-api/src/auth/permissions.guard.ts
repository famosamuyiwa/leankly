import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { permissionsForRole, UserPermission } from "./permissions";

export const PERMISSIONS_KEY = "permissions";

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext) {
    const permissions = this.reflector.getAllAndOverride<UserPermission[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!permissions?.length) return true;

    const user = context
      .switchToHttp()
      .getRequest<Express.Request>().currentUser;
    if (!user) return false;

    const granted = permissionsForRole(user.role);
    return permissions.every((permission) => granted.includes(permission));
  }
}
