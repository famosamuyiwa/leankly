const mockCreatePush = jest.fn();

jest.mock("node-appwrite", () => ({
  Client: jest.fn().mockImplementation(() => ({
    setEndpoint: jest.fn().mockReturnThis(),
    setProject: jest.fn().mockReturnThis(),
    setKey: jest.fn().mockReturnThis(),
  })),
  ID: { unique: jest.fn(() => "push-message-1") },
  Messaging: jest.fn().mockImplementation(() => ({
    createPush: mockCreatePush,
  })),
}));

import { AppwriteAdminService } from "./appwrite-admin.service";

describe("AppwriteAdminService", () => {
  it("passes badge and image fields to Appwrite Messaging", async () => {
    mockCreatePush.mockResolvedValue({ id: "message-1" });
    const config = {
      getOrThrow: jest.fn((key: string) => `${key}-value`),
    };
    const service = new AppwriteAdminService(config as never);

    await service.sendPush({
      recipients: ["appwrite-user-1"],
      title: "Coffee",
      body: "A new message",
      badge: 4,
      image: "cover-bucket:cover-file-1",
      data: { leankId: "leank-1" },
    });

    expect(mockCreatePush).toHaveBeenCalledWith({
      messageId: "push-message-1",
      users: ["appwrite-user-1"],
      title: "Coffee",
      body: "A new message",
      data: { leankId: "leank-1" },
      badge: 4,
      image: "cover-bucket:cover-file-1",
      sound: "default",
    });
  });
});
