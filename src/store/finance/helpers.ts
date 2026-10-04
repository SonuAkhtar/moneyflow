import { useUiStore } from "@/store/uiStore";
import { logger } from "@/lib/logger";
import { isAuthError, isTransientError, runWithRetry } from "@/lib/retry";
import { transactionDelta } from "@/utils";
import type { Account, Transaction } from "@/types";
import { runOp } from "./ops";
import { loadOutbox, saveOutbox, type OutboxGroup } from "./outbox";
import type {
  FinanceGet,
  FinanceSet,
  MutationHelpers,
  SyncStep,
} from "./types";

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

export const balanceDelta = (
  type: Transaction["type"],
  amount: number,
  note?: string | null,
): number => transactionDelta({ type, amount, note: note ?? null });

const RETRY_DELAYS = [5_000, 15_000, 30_000, 60_000];

const isOffline = () =>
  typeof navigator !== "undefined" && navigator.onLine === false;

type GroupResult = "done" | "blocked" | { failed: unknown };

export const createMutationHelpers = (
  set: FinanceSet,
  get: FinanceGet,
): MutationHelpers => {
  let groups: OutboxGroup[] = loadOutbox();
  let running: Promise<void> | null = null;
  let blocked = false;
  let needsResync = false;
  let retryTimer: ReturnType<typeof setTimeout> | null = null;
  let retryIndex = 0;

  const currentUid = () => get().profile?.id ?? null;
  const mine = () => groups.filter((g) => g.uid === currentUid());
  const persist = () => saveOutbox(groups);

  const publish = () => {
    const pending = mine().length;
    set({
      pendingSync: pending,
      syncStatus: pending === 0 ? "idle" : blocked ? "offline" : "syncing",
    });
  };

  const ownerId = () => {
    const id = currentUid();
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

  const undoGroup = async (group: OutboxGroup) => {
    for (let i = group.cursor - 1; i >= 0; i -= 1) {
      for (const op of group.steps[i]?.undo ?? []) {
        try {
          await runOp(group.uid, op);
        } catch (err) {
          logger.error("finance.sync.undo", err);
        }
      }
    }
  };

  const runGroup = async (group: OutboxGroup): Promise<GroupResult> => {
    while (group.cursor < group.steps.length) {
      if (isOffline()) return "blocked";
      const current = group.steps[group.cursor]!;
      const exec = () => runOp(group.uid, current.op, persist);
      try {
        if (current.retry === false) await exec();
        else await runWithRetry(exec);
      } catch (err) {
        if (isOffline() || isTransientError(err)) return "blocked";
        await undoGroup(group);
        return { failed: err };
      }
      group.cursor += 1;
      persist();
    }
    return "done";
  };

  const scheduleRetry = () => {
    if (retryTimer || typeof window === "undefined") return;
    const delay = RETRY_DELAYS[Math.min(retryIndex, RETRY_DELAYS.length - 1)];
    retryIndex += 1;
    retryTimer = setTimeout(() => {
      retryTimer = null;
      void kick();
    }, delay);
  };

  const resync = async () => {
    const uid = currentUid();
    if (!uid) return;
    try {
      await get().hydrate(uid);
    } catch (err) {
      logger.error("finance.sync.resync", err);
    }
  };

  const processQueue = async () => {
    blocked = false;
    publish();
    for (;;) {
      const group = mine()[0];
      if (!group) break;
      const result = await runGroup(group);
      if (result === "blocked") {
        blocked = true;
        scheduleRetry();
        break;
      }
      groups = groups.filter((g) => g !== group);
      persist();
      retryIndex = 0;
      if (result !== "done") {
        const err = result.failed;
        logger.error("finance.sync", err);
        needsResync = true;
        toastError(
          isAuthError(err)
            ? "Your session expired - please sign in again."
            : `${err instanceof Error ? err.message : "Sync failed"}. That change was reverted.`,
        );
      }
      publish();
    }
    publish();
  };

  const kick = (): Promise<void> => {
    if (retryTimer) {
      clearTimeout(retryTimer);
      retryTimer = null;
    }
    if (!running) {
      running = processQueue().finally(() => {
        running = null;
        if (!blocked && mine().length === 0 && needsResync) {
          needsResync = false;
          void resync();
        }
      });
    }
    return running;
  };

  if (typeof window !== "undefined") {
    window.addEventListener("online", () => void kick());
  }

  const sync = (steps: SyncStep[]) => {
    if (steps.length === 0) return;
    groups.push({ id: newId(), uid: ownerId(), steps, cursor: 0 });
    persist();
    publish();
    void kick();
  };

  return {
    ownerId,
    sync,
    toastError,
    idle: kick,
    pendingCount: () => mine().length,
    retry: () => void kick(),
    deferResync: () => {
      needsResync = true;
    },
    discardPending: () => {
      const uid = currentUid();
      groups = groups.filter((g) => g.uid !== uid);
      persist();
      publish();
    },
  };
};
