import { ExecutionContext } from "@nestjs/common";
import { UserRole } from "@prisma/client";
import { UserPermission } from "./permissions";
import { PERMISSIONS_KEY, PermissionsGuard } from "./permissions.guard";

function context(role: UserRole) {
  return {
    getHandler: () => function handler() {},
    getClass: () => class Controller {},
    switchToHttp: () => ({
      getRequest: () => ({ currentUser: { role } }),
    }),
  } as unknown as ExecutionContext;
}

describe("PermissionsGuard", () => {
  it("blocks users without the required permission", () => {
    const reflector = {
      getAllAndOverride: jest.fn((key) =>
        key === PERMISSIONS_KEY
          ? [UserPermission.LEANKLY_PLUS_BYPASS]
          : undefined,
      ),
    };
    const guard = new PermissionsGuard(reflector as never);

    expect(guard.canActivate(context(UserRole.USER))).toBe(false);
  });

  it("allows QA, DEV, and ADMIN through the bypass permission", () => {
    const reflector = {
      getAllAndOverride: jest.fn((key) =>
        key === PERMISSIONS_KEY
          ? [UserPermission.LEANKLY_PLUS_BYPASS]
          : undefined,
      ),
    };
    const guard = new PermissionsGuard(reflector as never);

    expect(guard.canActivate(context(UserRole.QA))).toBe(true);
    expect(guard.canActivate(context(UserRole.DEV))).toBe(true);
    expect(guard.canActivate(context(UserRole.ADMIN))).toBe(true);
  });
});
