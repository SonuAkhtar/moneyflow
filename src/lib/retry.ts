const TRANSIENT =
  /network|fetch failed|failed to fetch|timeout|timed out|temporarily|ETIMEDOUT|ECONNRESET|503|429/i;

const AUTH =
  /\bjwt\b|unauthorized|401|not authenticated|invalid (refresh )?token|session.*(expired|missing)/i;

const messageOf = (err: unknown): string =>
  err instanceof Error ? err.message : String(err ?? "");

export const isTransientError = (err: unknown): boolean =>
  TRANSIENT.test(messageOf(err));

export const isAuthError = (err: unknown): boolean => AUTH.test(messageOf(err));

export interface RetryOptions {
  retries?: number;
  baseDelay?: number;
  sleep?: (ms: number) => Promise<void>;
}

const defaultSleep = (ms: number) =>
  new Promise<void>((r) => setTimeout(r, ms));

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
