import { ClassificationProcessor } from "./classification.processor";

describe("ClassificationProcessor", () => {
  it("starts without OpenAI credentials and reports a clear job error", async () => {
    const config = {
      get: jest.fn((key: string) =>
        key === "OPENAI_CLASSIFICATION_MODEL" ? "test-model" : "",
      ),
    };
    const processor = new ClassificationProcessor(config as never, {} as never);

    await expect(
      processor.process({
        data: { leankId: "leank-1", title: "Coffee", description: "Meet up" },
      } as never),
    ).rejects.toThrow("OPENAI_API_KEY is required to classify leanks");
  });
});
