import { PushProcessor } from "./push.processor";

describe("PushProcessor", () => {
  it("passes recipient Appwrite user IDs and payload to Messaging", async () => {
    const sendPush = jest.fn(() => Promise.resolve({ id: "message-1" }));
    const processor = new PushProcessor({ sendPush } as never);
    const data = {
      recipients: ["appwrite-user-1", "appwrite-user-2"],
      title: "Coffee",
      body: "A new message",
      data: { leankId: "leank-1" },
      badge: 3,
      image: "cover-bucket:cover-file-1",
    };

    await processor.process({ data } as never);
    expect(sendPush).toHaveBeenCalledWith(data);
  });
});
