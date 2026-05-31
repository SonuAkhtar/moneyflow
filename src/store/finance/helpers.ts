import { useUiStore } from "@/store/uiStore";
import { logger } from "@/lib/logger";
import { isAuthError, runWithRetry } from "@/lib/retry";
import type { Account } from "@/types";
import type { FinanceGet, MutationHelpers } from "./types";

export const newId = () => crypto.randomUUID();

export const applyBalance = (
  accounts: Account[],
  accountId: string,
  delta: number,
): Account[] =>
  accounts.map((a) =>
    a.id === accountId
      ? { ...a, balance: Math.round((a.balance + delta) * 100) / 100 }
      : a,
  );

// Budgets that changed keep a fresh reference; unchanged ones are returned as-is.
export const changedFrom = <T>(next: T[], prev: T[]): T[] =>
  next.filter((item) => !prev.includes(item));

// Builds the shared per-mutation helpers (owner id resolution + the optimistic
// write-through `sync`) bound to this store's get().
export const createMutationHelpers = (get: FinanceGet): MutationHelpers => {
  const ownerId = () => {
    const id = get().profile?.id;
    if (!id) {
      throw new Error(
        "Cannot mutate finance data before the profile is loaded.",
      );
    }
    return id;
  };

  const toastError = (message: string) =>
    useUiStore.getState().pushToast({
      title: "Couldn't save",
      description: message,
      variant: "error",
    });

  // Run a write-through to Supabase in the background:
  //  • transient failures (network/rate-limit) are retried with backoff;
  //  • auth failures surface a "session expired" notice (re-sync won't help);
  //  • anything else toasts the error and re-syncs from the server so the
  //    optimistic local state can't drift.
  const sync = (work: () => Promise<void>) => {
    void (async () => {
      try {
        await runWithRetry(work);
      } catch (err) {
        logger.error("finance.sync", err);
        if (isAuthError(err)) {
          toastError("Your session expired — please sign in again.");
          return;
        }
        toastError(err instanceof Error ? err.message : "Sync failed");
        const id = get().profile?.id;
        if (id) {
          try {
            await get().hydrate(id);
          } catch (rehydrateErr) {
            logger.error("finance.sync.rehydrate", rehydrateErr);
          }
        }
      }
    })();
  };

  return { ownerId, sync, toastError };
};
