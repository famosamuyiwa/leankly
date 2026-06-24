import { UserRole } from "@prisma/client";

export enum UserPermission {
  LEANKLY_PLUS_BYPASS = "leankly_plus_bypass",
}

const ALL_PERMISSIONS = Object.values(UserPermission);

const ROLE_PERMISSIONS: Record<UserRole, UserPermission[]> = {
  [UserRole.USER]: [],
  [UserRole.ADMIN]: ALL_PERMISSIONS,
  [UserRole.QA]: [UserPermission.LEANKLY_PLUS_BYPASS],
  [UserRole.DEV]: [UserPermission.LEANKLY_PLUS_BYPASS],
};

export function permissionsForRole(role: UserRole) {
  return ROLE_PERMISSIONS[role] ?? [];
}

export function hasPermission(role: UserRole, permission: UserPermission) {
  return permissionsForRole(role).includes(permission);
}

export function canUseDeveloperMode(role: UserRole) {
  return role === UserRole.QA || role === UserRole.DEV;
}
