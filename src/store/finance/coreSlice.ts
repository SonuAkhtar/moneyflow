import { fetchSnapshot, profileRepo } from "@/services/repositories";
import { emptyState, type FinanceState, type SliceCreator } from "./types";

type CoreSlice = Pick<FinanceState, "hydrate" | "resetAll" | "updateProfile">;

export const createCoreSlice: SliceCreator<CoreSlice> = (
  set,
  get,
  { sync, toastError },
) => ({
  hydrate: async (userId) => {
    try {
      const snap = await fetchSnapshot(userId);
      set({
        initialized: true,
        hasHydrated: true,
        majorAccountId: snap.majorAccountId,
        dailyAccountId: snap.dailyAccountId,
        profile: snap.profile,
        accounts: snap.accounts,
        transactions: snap.transactions,
        emis: snap.emis,
        borrowings: snap.borrowings,
      });
    } catch (err) {
      toastError(
        err instanceof Error ? err.message : "Couldn't load your data",
      );
      set({ hasHydrated: true });
    }
  },

  resetAll: () => set({ ...emptyState, hasHydrated: true }),

  updateProfile: (patch) => {
    const s = get();
    if (!s.profile) return;
    set({ profile: { ...s.profile, ...patch } });
    const uid = s.profile.id;
    sync(() => profileRepo.update(uid, patch));
  },
});
