// Error classification + retry-with-backoff for write-through persistence.
// Pure and side-effect-free (delays are injectable) so it's fully unit-testable.

const TRANSIENT =
  /network|fetch failed|failed to fetch|timeout|timed out|temporarily|ETIMEDOUT|ECONNRESET|503|429/i;

const AUTH = /\bjwt\b|unauthorized|401|not authenticated|invalid (refresh )?token|session.*(expired|missing)/i;

const messageOf = (err: unknown): string =>
  err instanceof Error ? err.message : String(err ?? "");

// Worth retrying automatically (network blips, rate limits, gateway hiccups).
export const isTransientError = (err: unknown): boolean =>
  TRANSIENT.test(messageOf(err));

// The session is gone/expired — retrying or re-syncing won't help.
export const isAuthError = (err: unknown): boolean => AUTH.test(messageOf(err));

export interface RetryOptions {
  /** Number of *retries* after the first attempt. Total tries = retries + 1. */
  retries?: number;
  /** Base backoff in ms; the nth retry waits baseDelay * n. */
  baseDelay?: number;
  /** Injectable sleeper (tests pass an immediate one). */
  sleep?: (ms: number) => Promise<void>;
}

const defaultSleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

// Runs `work`, retrying only transient failures with linear backoff.
export const runWithRetry = async <T>(
  work: () => Promise<T>,
  { retries = 2, baseDelay = 400, sleep = defaultSleep }: RetryOptions = {},
): Promise<T> => {
  let attempt = 0;
  for (;;) {
    try {
      return await work();
    } catch (err) {
      if (attempt >= retries || !isTransientError(err)) throw err;
      attempt += 1;
      if (baseDelay > 0) await sleep(baseDelay * attempt);
    }
  }
};
