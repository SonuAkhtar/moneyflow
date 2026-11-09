import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  clientIp,
  createRateLimiter,
  hitRateLimit,
  rateRule,
} from "./rateLimit";

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

  it("prefers platform headers and ignores client-supplied forwarded IPs", () => {
    expect(
      clientIp(new Headers({ "x-forwarded-for": "6.6.6.6, 1.2.3.4" })),
    ).toBe("1.2.3.4");
    expect(
      clientIp(
        new Headers({ "x-forwarded-for": "6.6.6.6", "x-real-ip": "5.6.7.8" }),
      ),
    ).toBe("6.6.6.6");
    expect(
      clientIp(
        new Headers({
          "x-vercel-forwarded-for": "9.9.9.9",
          "x-real-ip": "5.6.7.8",
        }),
      ),
    ).toBe("9.9.9.9");
    expect(clientIp(new Headers())).toBe("unknown");
  });
});

describe("hitRateLimit", () => {
  const rule = rateRule("test", 1, 60_000);
  const client = (result: { data: unknown; error: unknown }) =>
    ({ rpc: vi.fn(async () => result) }) as unknown as SupabaseClient;

  it("uses the shared counter's verdict", async () => {
    const shared = client({ data: 12, error: null });
    expect(await hitRateLimit(shared, rule, "k")).toEqual({
      ok: false,
      retryAfter: 12,
    });
    expect(shared.rpc).toHaveBeenCalledWith("hit_rate_limit", {
      p_key: "test:k",
      p_max: 1,
      p_window_seconds: 60,
    });
    expect(
      await hitRateLimit(client({ data: 0, error: null }), rule, "k"),
    ).toEqual({ ok: true, retryAfter: 0 });
  });

  it("falls back to the in-memory limiter when the RPC fails", async () => {
    const down = client({ data: null, error: { code: "08006" } });
    expect((await hitRateLimit(down, rule, "x")).ok).toBe(true);
    expect((await hitRateLimit(down, rule, "x")).ok).toBe(false);
  });
});
