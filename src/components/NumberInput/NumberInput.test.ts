import { describe, expect, it } from "vitest";
import { sanitizeNumber } from "./NumberInput";

describe("sanitizeNumber", () => {
  it("keeps at most 10 whole digits so amounts fit the database", () => {
    expect(sanitizeNumber("1000000000000", true)).toBe("1000000000");
    expect(sanitizeNumber("12345678901.55", true)).toBe("1234567890.55");
    expect(sanitizeNumber("99999999999", false)).toBe("9999999999");
  });

  it("drops letters and extra decimal points", () => {
    expect(sanitizeNumber("5e3-", true)).toBe("53");
    expect(sanitizeNumber("1.2.34", true)).toBe("1.23");
    expect(sanitizeNumber("1.5", false)).toBe("15");
  });
});
