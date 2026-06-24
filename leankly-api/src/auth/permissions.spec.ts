import { UserRole } from "@prisma/client";
import {
  canUseDeveloperMode,
  hasPermission,
  permissionsForRole,
  UserPermission,
} from "./permissions";

describe("role permissions", () => {
  it("grants all permissions to admins", () => {
    expect(permissionsForRole(UserRole.ADMIN)).toContain(
      UserPermission.LEANKLY_PLUS_BYPASS,
    );
    expect(
      hasPermission(UserRole.ADMIN, UserPermission.LEANKLY_PLUS_BYPASS),
    ).toBe(true);
  });

  it("allows QA and DEV users to use Developer Mode", () => {
    expect(hasPermission(UserRole.QA, UserPermission.LEANKLY_PLUS_BYPASS)).toBe(
      true,
    );
    expect(
      hasPermission(UserRole.DEV, UserPermission.LEANKLY_PLUS_BYPASS),
    ).toBe(true);
    expect(canUseDeveloperMode(UserRole.QA)).toBe(true);
    expect(canUseDeveloperMode(UserRole.DEV)).toBe(true);
  });

  it("keeps regular users out of bypass permissions", () => {
    expect(
      hasPermission(UserRole.USER, UserPermission.LEANKLY_PLUS_BYPASS),
    ).toBe(false);
    expect(canUseDeveloperMode(UserRole.USER)).toBe(false);
    expect(canUseDeveloperMode(UserRole.ADMIN)).toBe(false);
  });
});
