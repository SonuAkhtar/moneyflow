import { generateSeed } from "@/services/seed.service";
import {
  accountRepo,
  budgetRepo,
  emiRepo,
  fetchSnapshot,
  profileRepo,
  transactionRepo,
} from "@/services/repositories";
import {
  computeHealthScore,
  currentMonthKey,
  healthBand,
  isoNow,
  monthKey,
} from "@/utils";
import type { Budget, MonthlySummary } from "@/types";
import { newId } from "./helpers";
import { emptyState, type FinanceState, type SliceCreator } from "./types";

type CoreSlice = Pick<
  FinanceState,
  "hydrate" | "loadDemoData" | "resetAll" | "updateProfile" | "runMonthlyRollover"
>;

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
        activeMonth: currentMonthKey(),
        majorAccountId: snap.majorAccountId,
        dailyAccountId: snap.dailyAccountId,
        profile: snap.profile,
        accounts: snap.accounts,
        transactions: snap.transactions,
        emis: snap.emis,
        budgets: snap.budgets,
        borrowings: snap.borrowings,
        summaries: [],
      });
      get().runMonthlyRollover();
    } catch (err) {
      toastError(
        err instanceof Error ? err.message : "Couldn't load your data",
      );
      set({ hasHydrated: true });
    }
  },

  loadDemoData: async () => {
    const profile = get().profile;
    if (!profile) return;
    try {
      const seed = generateSeed(
        profile.id,
        profile.fullName,
        profile.email,
        profile.currency,
      );
      await Promise.all(seed.accounts.map((a) => accountRepo.save(a)));
      await Promise.all(seed.emis.map((e) => emiRepo.save(e)));
      await Promise.all([
        ...seed.transactions.map((t) => transactionRepo.save(t)),
        ...seed.emis.flatMap((e) =>
          e.payments.map((p) => emiRepo.savePayment(p, e.id, profile.id)),
        ),
        ...seed.budgets.map((b) => budgetRepo.save(b)),
        profileRepo.update(profile.id, {
          monthlySalary: seed.profile.monthlySalary,
          savingsTarget: seed.profile.savingsTarget,
          onboardingComplete: true,
        }),
      ]);
      await get().hydrate(profile.id);
    } catch (err) {
      toastError(
        err instanceof Error ? err.message : "Couldn't load demo data",
      );
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

  runMonthlyRollover: () => {
    const s = get();
    const current = currentMonthKey();
    if (s.activeMonth === current || !s.profile) return;

    const prev = s.activeMonth;
    const income = s.transactions
      .filter((t) => t.type === "income" && monthKey(t.occurredAt) === prev)
      .reduce((acc, t) => acc + t.amount, 0);
    const expenses = s.transactions
      .filter((t) => t.type === "expense" && monthKey(t.occurredAt) === prev)
      .reduce((acc, t) => acc + t.amount, 0);
    const emiBurden = s.emis
      .filter((e) => e.status === "active")
      .reduce((acc, e) => acc + e.monthlyAmount, 0);
    const saved = Math.max(0, income - expenses);
    const prevCarry =
      s.summaries.find((sum) => sum.month === prev)?.carriedForward ?? 0;
    const score = computeHealthScore({
      income,
      expenses,
      savings: saved,
      emiBurden,
      budgetAdherence: 70,
    });

    const summary: MonthlySummary = {
      id: newId(),
      userId: s.profile.id,
      month: prev,
      income,
      expenses: Math.round(expenses * 100) / 100,
      saved: Math.round(saved * 100) / 100,
      carriedForward: Math.round((prevCarry + saved) * 100) / 100,
      healthScore: score,
      healthBand: healthBand(score),
      createdAt: isoNow(),
    };

    const summaries = [
      summary,
      ...s.summaries.filter((sum) => sum.month !== prev),
    ];

    const newBudgets: Budget[] = s.budgets
      .filter((b) => b.month === prev)
      .map((b) => ({
        ...b,
        id: newId(),
        spent: 0,
        month: current,
        createdAt: isoNow(),
      }));

    set({
      activeMonth: current,
      summaries,
      budgets: [...s.budgets, ...newBudgets],
    });

    if (newBudgets.length) {
      sync(() =>
        Promise.all(newBudgets.map((b) => budgetRepo.save(b))).then(
          () => undefined,
        ),
      );
    }
  },
});
