import { BadRequestException } from "@nestjs/common";
import { ReferralsService } from "./referrals.service";

const user = {
  id: "00000000-0000-4000-8000-000000000001",
  name: "Jane",
} as never;

describe("ReferralsService", () => {
  it("rejects an unknown code", async () => {
    const prisma = {
      user: { findFirst: jest.fn(() => Promise.resolve(null)) },
    };
    const service = new ReferralsService(prisma as never);
    await expect(service.apply(user, "NOPE")).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it("returns idempotently when the same referral was already applied", async () => {
    const referrer = { id: "00000000-0000-4000-8000-000000000002" };
    const prisma = {
      user: { findFirst: jest.fn(() => Promise.resolve(referrer)) },
      referral: {
        findUnique: jest.fn(() => Promise.resolve({ referrerId: referrer.id })),
      },
    };
    const service = new ReferralsService(prisma as never);
    await expect(service.apply(user, "JANE-1234")).resolves.toEqual({
      applied: false,
      reason: "ALREADY_APPLIED",
    });
  });
});
