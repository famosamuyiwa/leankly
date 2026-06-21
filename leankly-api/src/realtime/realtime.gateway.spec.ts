import { RealtimeGateway } from "./realtime.gateway";

describe("RealtimeGateway", () => {
  it("allows only leank members to subscribe to a chat room", async () => {
    const prisma = {
      leank: { findFirst: jest.fn(() => Promise.resolve(null)) },
    };
    const gateway = new RealtimeGateway({} as never, prisma as never);
    const client = {
      data: { userId: "user-1" },
      join: jest.fn(),
    };

    await expect(
      gateway.subscribe(client as never, { leankId: "leank-1" }),
    ).resolves.toEqual({ ok: false });
    expect(client.join).not.toHaveBeenCalled();
  });
});
