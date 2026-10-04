import { describe, expect, it } from "vitest";
import { clientIp, createRateLimiter } from "./rateLimit";

describe("createRateLimiter", () => {
  it("allows up to the limit per window, then blocks until it resets", () => {
    let t = 0;
    const rl = createRateLimiter(2, 1000, () => t);
    expect(rl.check("k").ok).toBe(true);
    expect(rl.check("k").ok).toBe(true);
    const blocked = rl.check("k");
    expect(blocked).toEqual({ ok: false, retryAfter: 1 });
    expect(rl.check("other").ok).toBe(true);
    t = 1000;
    expect(rl.check("k").ok).toBe(true);
  });

  it("reads the first forwarded IP", () => {
    expect(
      clientIp(new Headers({ "x-forwarded-for": "1.2.3.4, 10.0.0.1" })),
    ).toBe("1.2.3.4");
    expect(clientIp(new Headers({ "x-real-ip": "5.6.7.8" }))).toBe("5.6.7.8");
    expect(clientIp(new Headers())).toBe("unknown");
  });
});
