import { User } from "@prisma/client";
import { UsersService } from "./users.service";

const user = {
  id: "00000000-0000-4000-8000-000000000001",
} as User;

describe("UsersService", () => {
  it("cascades domain data and writes the deletion tombstone transactionally", async () => {
    const tx = {
      leank: {
        deleteMany: jest.fn(() => Promise.resolve({ count: 1 })),
        updateMany: jest.fn(() => Promise.resolve({ count: 1 })),
      },
      participant: {
        deleteMany: jest.fn(() => Promise.resolve({ count: 1 })),
      },
      reaction: { deleteMany: jest.fn(() => Promise.resolve({ count: 1 })) },
      userChatMeta: {
        deleteMany: jest.fn(() => Promise.resolve({ count: 1 })),
      },
      message: { deleteMany: jest.fn(() => Promise.resolve({ count: 1 })) },
      block: { deleteMany: jest.fn(() => Promise.resolve({ count: 1 })) },
      report: { deleteMany: jest.fn(() => Promise.resolve({ count: 1 })) },
      referral: { deleteMany: jest.fn(() => Promise.resolve({ count: 1 })) },
      dailyUsage: {
        deleteMany: jest.fn(() => Promise.resolve({ count: 1 })),
      },
      userEntitlement: {
        deleteMany: jest.fn(() => Promise.resolve({ count: 1 })),
      },
      user: { update: jest.fn(() => Promise.resolve(user)) },
    };
    const prisma = {
      $transaction: jest.fn((callback: (client: typeof tx) => unknown) =>
        callback(tx),
      ),
    };
    const service = new UsersService(prisma as never, {} as never, {} as never);

    const result = await service.deleteProfile(user);

    expect(result.deletedAt).toBeInstanceOf(Date);
    expect(tx.leank.deleteMany).toHaveBeenCalledWith({
      where: { ownerId: user.id },
    });
    expect(tx.participant.deleteMany).toHaveBeenCalledWith({
      where: { userId: user.id },
    });
    expect(tx.reaction.deleteMany).toHaveBeenCalledWith({
      where: { userId: user.id },
    });
    expect(tx.userChatMeta.deleteMany).toHaveBeenCalledWith({
      where: { userId: user.id },
    });
    expect(tx.leank.updateMany).toHaveBeenCalledWith({
      where: { lastMessage: { is: { senderId: user.id } } },
      data: { lastMessageId: null, lastMessageAt: null },
    });
    expect(tx.message.deleteMany).toHaveBeenCalledWith({
      where: { senderId: user.id },
    });
    expect(tx.user.update).toHaveBeenCalledWith({
      where: { id: user.id },
      data: expect.objectContaining({
        deletedAt: result.deletedAt,
        isActive: false,
        pushEnabled: false,
        pushTargetId: null,
      }),
    });
  });
});
