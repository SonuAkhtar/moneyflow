import {
  budgetRepo,
  fetchSnapshot,
  profileRepo,
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
) => ({
  hydrate: async (userId) => {
    try {
      await idle();
      if (pendingCount() > 0) {
        deferResync();
        set({ hasHydrated: true });
        return;
      }
      const snap = await fetchSnapshot(userId);
      let profile = snap.profile;
      if (profile && snap.authEmail && snap.authEmail !== profile.email) {
        profile = { ...profile, email: snap.authEmail };
        const email = snap.authEmail;
        void profileRepo
          .update(userId, { email })
          .catch((err) => logger.error("hydrate.syncEmail", err));
      }
      let budgets = snap.budgets ?? {};
      const local = get().budgets;
      if (
        snap.budgets === null &&
        Object.keys(local).length > 0 &&
        get().profile?.id === userId
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
        historyFrom: snap.historyFrom,
      });
      if (pendingCount() > 0) {
        deferResync();
        void idle();
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Couldn't load your data";
      logger.error("hydrate", err);
      set({ hasHydrated: true, loadError: message });
      if (get().profile) toastError(message);
    }
  },

  resetAll: () => set({ ...emptyState, hasHydrated: true }),

  flushSync: () => idle(),

  retrySync: () => retry(),

  loadHistory: async (month) => {
    const s = get();
    const uid = s.profile?.id;
    if (!uid || !s.historyFrom || s.historyLoading) return;
    const [y, m] = month.split("-").map(Number);
    const from = new Date(y ?? 0, (m ?? 1) - 1, 1).toISOString();
    if (from >= s.historyFrom) return;
    set({ historyLoading: true });
    try {
      const older = await transactionRepo.listRange(uid, from, s.historyFrom);
      const known = new Set(get().transactions.map((t) => t.id));
      set({
        transactions: [
          ...get().transactions,
          ...older.filter((t) => !known.has(t.id)),
        ],
        historyFrom: from,
      });
    } catch (err) {
      toastError(err instanceof Error ? err.message : "Couldn't load history");
    } finally {
      set({ historyLoading: false });
    }
  },

  discardPendingSync: () => discardPending(),

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
});
