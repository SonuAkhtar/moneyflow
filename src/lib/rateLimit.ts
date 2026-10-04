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

export const clientIp = (headers: Headers): string =>
  headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
  headers.get("x-real-ip") ||
  "unknown";
