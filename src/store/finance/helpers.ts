import { useUiStore } from "@/store/uiStore";
import { useAuthStore } from "@/store/authStore";
import { logger } from "@/lib/logger";
import { getBrowserSupabase } from "@/lib/supabase/client";
import { isAuthError, isTransientError, runWithRetry } from "@/lib/retry";
import { transactionDelta } from "@/utils";
import type { Account, Transaction } from "@/types";
import { runOp, type Op } from "./ops";
import { loadOutbox, OUTBOX_KEY, saveOutbox, type OutboxGroup } from "./outbox";
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

type GroupResult = "done" | "blocked";

const writtenIds = (op: Op): string[] => {
  switch (op.k) {
    case "account.insert":
      return [op.account.id];
    case "txn.save":
      return [op.txn.id];
    case "emi.save":
      return [op.emi.id];
    case "borrowing.save":
      return [op.borrowing.id];
    case "emi.savePayment":
    case "borrowing.savePayment":
      return [op.payment.id];
    case "account.meta":
    case "account.remove":
    case "txn.remove":
    case "emi.remove":
    case "emi.removePayment":
    case "borrowing.remove":
    case "borrowing.removePayment":
      return [op.id];
    default:
      return [];
  }
};

const referencedIds = (op: Op): string[] => {
  switch (op.k) {
    case "account.adjust":
      return [op.id];
    case "txn.save":
      return [op.txn.accountId];
    case "txn.removeByAccount":
      return [op.accountId];
    case "emi.save":
      return op.emi.accountId ? [op.emi.accountId] : [];
    case "emi.savePayment":
      return [op.emiId, op.payment.accountId ?? ""];
    case "borrowing.savePayment":
      return [op.borrowingId];
    default:
      return [];
  }
};

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
  let queued = 0;
  const created = new Set<string>();

  const currentUid = () =>
    get().profile?.id ?? useAuthStore.getState().user?.id ?? null;
  const mine = () => groups.filter((g) => g.uid === currentUid());

  const commit = (update: (stored: OutboxGroup[]) => OutboxGroup[]) => {
    groups = update(loadOutbox());
    saveOutbox(groups);
  };
  const save = (group: OutboxGroup) =>
    commit((stored) => stored.map((g) => (g.id === group.id ? group : g)));

  const refresh = () => {
    groups = loadOutbox();
    for (const id of created) {
      if (groups.some((g) => g.id === id)) continue;
      created.delete(id);
      needsResync = true;
    }
  };

  const publish = () => {
    const pending = mine().length;
    set({
      pendingSync: pending,
      syncStatus: pending === 0 ? "idle" : blocked ? "offline" : "syncing",
    });
  };

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

  const isNetworkError = (err: unknown) => isOffline() || isTransientError(err);

  const refreshSession = async () => {
    try {
      const res = await getBrowserSupabase()?.auth.refreshSession();
      return Boolean(res && !res.error);
    } catch (err) {
      logger.error("finance.sync.refreshSession", err);
      return false;
    }
  };

  const undoGroup = async (group: OutboxGroup): Promise<GroupResult> => {
    while (group.cursor > 0) {
      for (const op of group.steps[group.cursor - 1]?.undo ?? []) {
        try {
          await runOp(group.uid, op, () => save(group));
        } catch (err) {
          if (
            isNetworkError(err) ||
            (isAuthError(err) && !(await refreshSession()))
          )
            return "blocked";
          logger.error("finance.sync.undo", err);
        }
      }
      group.cursor -= 1;
      save(group);
    }
    return "done";
  };

  const runGroup = async (group: OutboxGroup): Promise<GroupResult> => {
    if (group.undoing) return undoGroup(group);
    let authRetried = false;
    while (group.cursor < group.steps.length) {
      if (isOffline()) return "blocked";
      const current = group.steps[group.cursor]!;
      const exec = () => runOp(group.uid, current.op, () => save(group));
      try {
        await runWithRetry(exec);
      } catch (err) {
        if (isNetworkError(err)) return "blocked";
        if (isAuthError(err)) {
          if (!(await refreshSession())) return "blocked";
          if (!authRetried) {
            authRetried = true;
            continue;
          }
        }
        logger.error("finance.sync", err);
        needsResync = true;
        toastError(
          `${err instanceof Error ? err.message : "Sync failed"}. That change was reverted.`,
        );
        group.undoing = true;
        save(group);
        return undoGroup(group);
      }
      group.cursor += 1;
      authRetried = false;
      save(group);
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

  const resyncIfIdle = () => {
    if (running || blocked || mine().length > 0 || !needsResync) return;
    needsResync = false;
    void resync();
  };

  const processQueue = async () => {
    blocked = false;
    for (;;) {
      refresh();
      publish();
      const group = mine()[0];
      if (!group) break;
      if (!created.has(group.id)) needsResync = true;
      const result = await runGroup(group);
      if (result === "blocked") {
        blocked = true;
        scheduleRetry();
        break;
      }
      if (group.undoing) {
        const reverted = new Set(
          group.steps.flatMap((st) => writtenIds(st.op)),
        );
        const dropped: OutboxGroup[] = [];
        for (const g of mine()) {
          if (g.id === group.id) continue;
          const ops = g.steps.map((st) => st.op);
          const depends = ops.some((op) =>
            [...writtenIds(op), ...referencedIds(op)].some((id) =>
              reverted.has(id),
            ),
          );
          if (!depends) continue;
          dropped.push(g);
          for (const op of ops)
            for (const id of writtenIds(op)) reverted.add(id);
        }
        const gone = new Set([group.id, ...dropped.map((g) => g.id)]);
        commit((stored) => stored.filter((g) => !gone.has(g.id)));
        for (const id of gone) created.delete(id);
        needsResync = true;
        if (dropped.length > 0)
          toastError(
            `${dropped.length} later change${dropped.length === 1 ? " was" : "s were"} also reverted`,
          );
      } else {
        created.delete(group.id);
        commit((stored) => stored.filter((g) => g.id !== group.id));
      }
      retryIndex = 0;
    }
    publish();
  };

  const runExclusive = async (): Promise<void> => {
    if (typeof navigator !== "undefined" && navigator.locks)
      await navigator.locks.request(OUTBOX_KEY, processQueue);
    else await processQueue();
  };

  const kick = (): Promise<void> => {
    if (retryTimer) {
      clearTimeout(retryTimer);
      retryTimer = null;
    }
    if (!running) {
      running = runExclusive().finally(() => {
        running = null;
        resyncIfIdle();
      });
    }
    return running;
  };

  if (typeof window !== "undefined") {
    window.addEventListener("online", () => void kick());
    window.addEventListener("storage", (e) => {
      if (e.key !== OUTBOX_KEY && e.key !== null) return;
      refresh();
      publish();
      resyncIfIdle();
    });
  }

  const sync = (steps: SyncStep[]) => {
    if (steps.length === 0) return;
    const group: OutboxGroup = {
      id: newId(),
      uid: ownerId(),
      steps,
      cursor: 0,
    };
    created.add(group.id);
    queued += 1;
    commit((stored) => [...stored, group]);
    publish();
    void kick();
  };

  return {
    ownerId,
    sync,
    toastError,
    idle: kick,
    pendingCount: () => mine().length,
    queuedCount: () => queued,
    retry: () => void kick(),
    deferResync: () => {
      needsResync = true;
    },
    discardPending: (uid = currentUid() ?? undefined) => {
      if (!uid) return;
      commit((stored) => stored.filter((g) => g.uid !== uid));
      for (const id of created)
        if (!groups.some((g) => g.id === id)) created.delete(id);
      publish();
    },
  };
};
