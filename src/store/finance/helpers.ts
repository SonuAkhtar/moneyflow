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

  const sync = (work: () => Promise<void>) => {
    void (async () => {
      try {
        await runWithRetry(work);
      } catch (err) {
        logger.error("finance.sync", err);
        if (isAuthError(err)) {
          toastError("Your session expired - please sign in again.");
          return;
        }
        toastError(err instanceof Error ? err.message : "Sync failed");
      }
    })();
  };

  return { ownerId, sync, toastError };
};
