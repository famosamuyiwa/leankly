import { RevenueCatService } from "./revenuecat.service";

describe("RevenueCatService", () => {
  it("acknowledges a replay without updating entitlement state", async () => {
    const tx = {
      revenueCatWebhookEvent: {
        findUnique: jest.fn(() => Promise.resolve({ id: "receipt-1" })),
      },
      userEntitlement: { upsert: jest.fn() },
    };
    const prisma = {
      $transaction: jest.fn((callback: (transaction: typeof tx) => unknown) =>
        callback(tx),
      ),
    };
    const config = {
      getOrThrow: jest.fn(() => "webhook-secret"),
    };
    const service = new RevenueCatService(prisma as never, config as never);

    await expect(
      service.handle("Bearer webhook-secret", {
        event: { id: "event-1", type: "INITIAL_PURCHASE" },
      }),
    ).resolves.toEqual({ received: true, duplicate: true });
    expect(tx.userEntitlement.upsert).not.toHaveBeenCalled();
  });

  it("rejects an invalid webhook secret before touching the database", async () => {
    const prisma = { $transaction: jest.fn() };
    const config = {
      getOrThrow: jest.fn(() => "webhook-secret"),
    };
    const service = new RevenueCatService(prisma as never, config as never);

    await expect(
      service.handle("Bearer wrong", {
        event: { id: "event-1", type: "INITIAL_PURCHASE" },
      }),
    ).rejects.toMatchObject({ status: 401 });
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});
