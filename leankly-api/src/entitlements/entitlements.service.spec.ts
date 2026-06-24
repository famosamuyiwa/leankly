import { ForbiddenException } from "@nestjs/common";
import { User, UserRole } from "@prisma/client";
import { EntitlementsService } from "./entitlements.service";

const baseUser = {
  id: "00000000-0000-4000-8000-000000000001",
  role: UserRole.USER,
} as User;

const entitlement = (overrides: Record<string, unknown> = {}) => ({
  id: "entitlement-1",
  userId: baseUser.id,
  isPro: false,
  expiresAt: null,
  lastEventAt: null,
  developerModeEnabled: false,
  developerModeUpdatedAt: null,
  createdAt: new Date("2026-06-24T12:00:00.000Z"),
  updatedAt: new Date("2026-06-24T12:00:00.000Z"),
  ...overrides,
});

describe("EntitlementsService", () => {
  it("gives admins effective Leankly+ access without developer mode", async () => {
    const prisma = {
      userEntitlement: { findUnique: jest.fn(() => Promise.resolve(null)) },
    };
    const service = new EntitlementsService(prisma as never);

    await expect(
      service.get({ ...baseUser, role: UserRole.ADMIN }),
    ).resolves.toEqual(
      expect.objectContaining({
        isPro: true,
        paidActive: false,
        bypassActive: true,
        developerModeEnabled: false,
        canUseDeveloperMode: false,
      }),
    );
  });

  it("requires developer mode for non-paid QA and DEV effective access", async () => {
    const prisma = {
      userEntitlement: {
        findUnique: jest.fn(() =>
          Promise.resolve(entitlement({ developerModeEnabled: true })),
        ),
      },
    };
    const service = new EntitlementsService(prisma as never);

    await expect(
      service.get({ ...baseUser, role: UserRole.QA }),
    ).resolves.toEqual(
      expect.objectContaining({
        isPro: true,
        paidActive: false,
        bypassActive: true,
        developerModeEnabled: true,
        canUseDeveloperMode: true,
      }),
    );

    prisma.userEntitlement.findUnique.mockResolvedValueOnce(
      entitlement({ developerModeEnabled: false }),
    );
    await expect(
      service.get({ ...baseUser, role: UserRole.DEV }),
    ).resolves.toEqual(
      expect.objectContaining({
        isPro: false,
        bypassActive: false,
        developerModeEnabled: false,
        canUseDeveloperMode: true,
      }),
    );
  });

  it("keeps paid users Pro when developer mode is off", async () => {
    const prisma = {
      userEntitlement: {
        findUnique: jest.fn(() =>
          Promise.resolve(entitlement({ isPro: true, expiresAt: null })),
        ),
      },
    };
    const service = new EntitlementsService(prisma as never);

    await expect(service.get(baseUser)).resolves.toEqual(
      expect.objectContaining({
        isPro: true,
        paidActive: true,
        bypassActive: false,
      }),
    );
  });

  it("stores Developer Mode only for QA and DEV roles", async () => {
    const stored = entitlement({
      developerModeEnabled: true,
      developerModeUpdatedAt: new Date("2026-06-24T12:30:00.000Z"),
    });
    const prisma = {
      userEntitlement: {
        upsert: jest.fn(() => Promise.resolve(stored)),
      },
    };
    const service = new EntitlementsService(prisma as never);

    await expect(
      service.setDeveloperMode({ ...baseUser, role: UserRole.QA }, true),
    ).resolves.toEqual(
      expect.objectContaining({
        isPro: true,
        developerModeEnabled: true,
      }),
    );
    expect(prisma.userEntitlement.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({ developerModeEnabled: true }),
        update: expect.objectContaining({ developerModeEnabled: true }),
      }),
    );
  });

  it("rejects Developer Mode for regular users", async () => {
    const service = new EntitlementsService({} as never);

    await expect(
      service.setDeveloperMode(baseUser, true),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
