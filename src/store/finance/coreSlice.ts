import {
  budgetRepo,
  fetchSnapshot,
  transactionRepo,
} from "@/services/repositories";
import { logger } from "@/lib/logger";
import { setActiveCurrency } from "@/utils";
import type { Profile } from "@/types";
import { step } from "./steps";
import { emptyState, type FinanceState, type SliceCreator } from "./types";

type CoreSlice = Pick<
  FinanceState,
  | "hydrate"
  | "resetAll"
  | "updateProfile"
  | "flushSync"
  | "retrySync"
  | "discardPendingSync"
  | "loadHistory"
>;

const EPOCH = new Date(0).toISOString();

export const createCoreSlice: SliceCreator<CoreSlice> = (
  set,
  get,
  {
    sync,
    ownerId,
    idle,
    toastError,
    pendingCount,
    deferResync,
    retry,
    discardPending,
  },
) => {
  // Bumped by every hydrate and reset so a slower, older fetch is ignored.
  let generation = 0;

  const loadOlder = async (from: string) => {
    const s = get();
    const uid = s.profile?.id;
    if (!uid || !s.historyFrom || s.historyLoading) return;
    if (from >= s.historyFrom) return;
    set({ historyLoading: true });
    try {
      let older = await transactionRepo.listRange(uid, from, s.historyFrom);
      let exhausted = from <= EPOCH;
      // An empty range almost always means the start was reached: fetch
      // whatever is left once so "Load older" can stop.
      if (older.length === 0 && !exhausted) {
        older = await transactionRepo.listRange(uid, EPOCH, from);
        exhausted = true;
      }
      // A reload or sign-out replaced the loaded range meanwhile.
      if (get().historyFrom !== s.historyFrom) return;
      const known = new Set(get().transactions.map((t) => t.id));
      set({
        transactions: [
          ...get().transactions,
          ...older.filter((t) => !known.has(t.id)),
        ],
        historyFrom: exhausted ? null : from,
      });
    } catch (err) {
      toastError(err instanceof Error ? err.message : "Couldn't load history");
    } finally {
      set({ historyLoading: false });
    }
  };

  return {
    hydrate: async (userId) => {
      const gen = ++generation;
      try {
        await idle();
        if (get().profile?.id === userId && pendingCount() > 0) {
          deferResync();
          set({ hasHydrated: true });
          return;
        }
        const snap = await fetchSnapshot(userId);
        if (gen !== generation) return;
        const prev = get();
        const hasLocal = prev.profile?.id === userId;
        // Changes queued during the fetch aren't in the snapshot: keep the
        // optimistic state and resync once they're sent.
        if (hasLocal && pendingCount() > 0) {
          deferResync();
          set({ hasHydrated: true });
          void idle();
          return;
        }
        const keepFrom =
          hasLocal && prev.initialized ? prev.historyFrom : undefined;
        let profile = snap.profile;
        if (profile && snap.authEmail && snap.authEmail !== profile.email)
          profile = { ...profile, email: snap.authEmail };
        let budgets = snap.budgets ?? {};
        const local = prev.budgets;
        if (
          snap.budgets === null &&
          Object.keys(local).length > 0 &&
          hasLocal
        ) {
          budgets = local;
          void budgetRepo
            .save(local)
            .catch((err) => logger.error("hydrate.migrateBudgets", err));
        }
        setActiveCurrency(profile?.currency);
        set({
          initialized: true,
          hasHydrated: true,
          loadError: null,
          majorAccountId: snap.majorAccountId,
          dailyAccountId: snap.dailyAccountId,
          profile,
          accounts: snap.accounts,
          transactions: snap.transactions,
          emis: snap.emis,
          borrowings: snap.borrowings,
          budgets,
          spendBudget: snap.spendBudget,
          historyFrom: snap.historyFrom,
        });
        // Re-fetch older history the user had already loaded (null = all).
        if (
          snap.historyFrom &&
          keepFrom !== undefined &&
          (keepFrom === null || keepFrom < snap.historyFrom)
        )
          void loadOlder(keepFrom ?? EPOCH);
      } catch (err) {
        if (gen !== generation) return;
        const message =
          err instanceof Error ? err.message : "Couldn't load your data";
        logger.error("hydrate", err);
        set({ hasHydrated: true, loadError: message });
        if (get().profile) toastError(message);
      }
    },

    resetAll: () => {
      generation += 1;
      set({ ...emptyState, hasHydrated: true });
    },

    flushSync: () => idle(),

    retrySync: () => retry(),

    loadHistory: (month) => {
      const [y, m] = month.split("-").map(Number);
      return loadOlder(new Date(y ?? 0, (m ?? 1) - 1, 1).toISOString());
    },

    discardPendingSync: (uid) => discardPending(uid),

    updateProfile: (patch) => {
      const s = get();
      if (!s.profile) return;
      ownerId();
      const previous = Object.fromEntries(
        Object.keys(patch).map((k) => [k, s.profile![k as keyof Profile]]),
      ) as Partial<Profile>;
      if (patch.currency !== undefined) setActiveCurrency(patch.currency);
      set({ profile: { ...s.profile, ...patch } });
      sync([step.updateProfile(patch, previous)]);
    },
  };
};
