import type { SupabaseClient } from "@supabase/supabase-js";
import { logger } from "./logger";

interface Window {
  count: number;
  resetAt: number;
}

export interface RateLimiter {
  check: (key: string) => { ok: boolean; retryAfter: number };
  reset: () => void;
}

export const createRateLimiter = (
  limit: number,
  windowMs: number,
  now: () => number = Date.now,
): RateLimiter => {
  const hits = new Map<string, Window>();

  const sweep = (t: number) => {
    if (hits.size < 5_000) return;
    for (const [key, w] of hits) if (w.resetAt <= t) hits.delete(key);
  };

  return {
    check: (key) => {
      const t = now();
      sweep(t);
      const w = hits.get(key);
      if (!w || w.resetAt <= t) {
        hits.set(key, { count: 1, resetAt: t + windowMs });
        return { ok: true, retryAfter: 0 };
      }
      w.count += 1;
      if (w.count > limit) {
        return { ok: false, retryAfter: Math.ceil((w.resetAt - t) / 1000) };
      }
      return { ok: true, retryAfter: 0 };
    },
    reset: () => hits.clear(),
  };
};

export interface RateRule {
  name: string;
  limit: number;
  windowMs: number;
  local: RateLimiter;
}

export const rateRule = (
  name: string,
  limit: number,
  windowMs: number,
): RateRule => ({
  name,
  limit,
  windowMs,
  local: createRateLimiter(limit, windowMs),
});

export const hitRateLimit = async (
  serviceClient: SupabaseClient,
  rule: RateRule,
  key: string,
): Promise<{ ok: boolean; retryAfter: number }> => {
  const { data, error } = await serviceClient.rpc("hit_rate_limit", {
    p_key: `${rule.name}:${key}`,
    p_max: rule.limit,
    p_window_seconds: Math.ceil(rule.windowMs / 1000),
  });
  if (error || typeof data !== "number") {
    logger.warn("rateLimit", error?.code ?? "unexpected response");
    return rule.local.check(key);
  }
  return { ok: data === 0, retryAfter: data };
};

export const clientIp = (headers: Headers): string =>
  headers.get("x-vercel-forwarded-for")?.trim() ||
  headers.get("x-forwarded-for")?.split(",").pop()?.trim() ||
  "unknown";
