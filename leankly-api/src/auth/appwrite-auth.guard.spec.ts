import {
  ExecutionContext,
  ForbiddenException,
  GoneException,
} from "@nestjs/common";
import { UserRole } from "@prisma/client";
import { AppwriteAuthGuard } from "./appwrite-auth.guard";

const identity = {
  $id: "appwrite-user",
  email: "user@example.com",
  emailVerification: true,
  name: "User",
};

function context(request: Record<string, any>) {
  return {
    getHandler: () => function handler() {},
    getClass: () => class Controller {},
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
}

describe("AppwriteAuthGuard", () => {
  const reflector = { getAllAndOverride: jest.fn(() => false) };
  const appwrite = { verifyJwt: jest.fn(() => Promise.resolve(identity)) };
  const config = {
    get: jest.fn(() => ""),
    getOrThrow: jest.fn((key: string) =>
      key === "APPWRITE_ENDPOINT"
        ? "https://nyc.cloud.appwrite.io/v1"
        : "project",
    ),
  };

  beforeEach(() => jest.clearAllMocks());

  it("creates a mapped domain user from the verified identity", async () => {
    const created = {
      id: "domain-user",
      appwriteUserId: identity.$id,
      emailVerified: true,
      isActive: true,
      suspendedAt: null,
      deletedAt: null,
    };
    const prisma = {
      user: {
        findUnique: jest.fn(() => Promise.resolve(null)),
        upsert: jest.fn(() => Promise.resolve(created)),
      },
    };
    const guard = new AppwriteAuthGuard(
      reflector as never,
      appwrite as never,
      prisma as never,
      config as never,
    );
    const request = { headers: { authorization: "Bearer token" } };

    await expect(guard.canActivate(context(request))).resolves.toBe(true);
    expect(request).toMatchObject({
      currentUser: created,
      appwriteIdentity: identity,
    });
  });

  it("does not recreate a deleted profile", async () => {
    const prisma = {
      user: {
        findUnique: jest.fn(() => Promise.resolve({ deletedAt: new Date() })),
      },
    };
    const guard = new AppwriteAuthGuard(
      reflector as never,
      appwrite as never,
      prisma as never,
      config as never,
    );

    await expect(
      guard.canActivate(
        context({ headers: { authorization: "Bearer token" } }),
      ),
    ).rejects.toBeInstanceOf(GoneException);
  });

  it("rejects unverified identities on domain routes", async () => {
    appwrite.verifyJwt.mockResolvedValueOnce({
      ...identity,
      emailVerification: false,
    });
    const prisma = {
      user: {
        findUnique: jest.fn(() => Promise.resolve(null)),
        upsert: jest.fn(() =>
          Promise.resolve({
            id: "domain-user",
            isActive: true,
            suspendedAt: null,
            deletedAt: null,
          }),
        ),
      },
    };
    const guard = new AppwriteAuthGuard(
      reflector as never,
      appwrite as never,
      prisma as never,
      config as never,
    );

    await expect(
      guard.canActivate(
        context({ headers: { authorization: "Bearer token" } }),
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("uses configured role priority when an Appwrite ID appears in multiple lists", async () => {
    appwrite.verifyJwt.mockResolvedValueOnce({
      ...identity,
      $id: "shared-user",
    });
    (config.get as jest.Mock).mockImplementation((key: string) => {
      if (key === "ADMIN_APPWRITE_USER_IDS") return "shared-user";
      if (key === "QA_APPWRITE_USER_IDS") return "shared-user,qa-user";
      if (key === "DEV_APPWRITE_USER_IDS") return "shared-user,dev-user";
      return "";
    });
    const prisma = {
      user: {
        findUnique: jest.fn(() => Promise.resolve(null)),
        upsert: jest.fn(() =>
          Promise.resolve({
            id: "domain-user",
            role: UserRole.ADMIN,
            isActive: true,
            suspendedAt: null,
            deletedAt: null,
          }),
        ),
      },
    };
    const guard = new AppwriteAuthGuard(
      reflector as never,
      appwrite as never,
      prisma as never,
      config as never,
    );

    await expect(
      guard.canActivate(
        context({ headers: { authorization: "Bearer token" } }),
      ),
    ).resolves.toBe(true);
    expect(prisma.user.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({ role: UserRole.ADMIN }),
        update: expect.objectContaining({ role: UserRole.ADMIN }),
      }),
    );
  });
});
