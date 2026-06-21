import { HealthController } from "./health.controller";

describe("HealthController", () => {
  it("returns service metadata", () => {
    const controller = new HealthController({} as never, {} as never);
    expect(controller.getHealth()).toMatchObject({
      status: "ok",
      version: "1.0.0",
    });
  });
});
