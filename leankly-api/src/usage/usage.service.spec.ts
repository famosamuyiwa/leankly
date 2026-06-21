import { utcUsageDate } from "./usage.service";

describe("utcUsageDate", () => {
  it("normalizes counters to UTC midnight", () => {
    expect(
      utcUsageDate(new Date("2026-06-21T23:59:59.000Z")).toISOString(),
    ).toBe("2026-06-21T00:00:00.000Z");
  });
});
