import { AdminService } from "./admin.service";

describe("AdminService", () => {
  it("suspends both access flags atomically in one update", async () => {
    const update = jest.fn(() =>
      Promise.resolve({
        id: "user-1",
        isActive: false,
        suspendedAt: new Date(),
      }),
    );
    const prisma = {
      user: {
        findUnique: jest.fn(() => Promise.resolve({ id: "user-1" })),
        update,
      },
    };
    const service = new AdminService(prisma as never);

    await service.suspend("user-1", true);
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "user-1" },
        data: { suspendedAt: expect.any(Date), isActive: false },
      }),
    );
  });
});
