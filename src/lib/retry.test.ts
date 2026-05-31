import { describe, expect, it, vi } from "vitest";
import { isAuthError, isTransientError, runWithRetry } from "@/lib/retry";

const noSleep = () => Promise.resolve();

describe("error classification", () => {
  it("flags transient errors", () => {
    expect(isTransientError(new Error("Failed to fetch"))).toBe(true);
    expect(isTransientError(new Error("network timeout"))).toBe(true);
    expect(isTransientError(new Error("503 Service Unavailable"))).toBe(true);
  });
  it("does not flag permanent errors as transient", () => {
    expect(isTransientError(new Error("duplicate key value"))).toBe(false);
    expect(isTransientError(new Error("violates row-level security"))).toBe(false);
  });
  it("flags auth errors", () => {
    expect(isAuthError(new Error("JWT expired"))).toBe(true);
    expect(isAuthError(new Error("Unauthorized"))).toBe(true);
    expect(isAuthError(new Error("not authenticated"))).toBe(true);
  });
});

describe("runWithRetry", () => {
  it("returns immediately on success (no retry)", async () => {
    const work = vi.fn().mockResolvedValue("ok");
    await expect(runWithRetry(work, { sleep: noSleep })).resolves.toBe("ok");
    expect(work).toHaveBeenCalledTimes(1);
  });

  it("retries transient failures then succeeds", async () => {
    const work = vi
      .fn()
      .mockRejectedValueOnce(new Error("network glitch"))
      .mockRejectedValueOnce(new Error("network glitch"))
      .mockResolvedValue("ok");
    await expect(runWithRetry(work, { sleep: noSleep })).resolves.toBe("ok");
    expect(work).toHaveBeenCalledTimes(3);
  });

  it("does NOT retry non-transient failures", async () => {
    const work = vi.fn().mockRejectedValue(new Error("duplicate key value"));
    await expect(runWithRetry(work, { sleep: noSleep })).rejects.toThrow(
      "duplicate key",
    );
    expect(work).toHaveBeenCalledTimes(1);
  });

  it("gives up after exhausting retries", async () => {
    const work = vi.fn().mockRejectedValue(new Error("network down"));
    await expect(
      runWithRetry(work, { retries: 2, sleep: noSleep }),
    ).rejects.toThrow("network down");
    expect(work).toHaveBeenCalledTimes(3); // 1 + 2 retries
  });
});
