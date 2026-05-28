"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { APP, BIG_EXPENSE_THRESHOLD } from "@/constants";
import { generateSeed } from "@/services/seed.service";
import { createId, currentMonthKey, isoNow, monthKey, computeHealthScore, healthBand } from "@/utils";
import type {
  Account,
  AccountInput,
  AppNotification,
  Budget,
  BudgetInput,
  Emi,
  GoalInput,
  MonthlySummary,
  Profile,
  SavingGoal,
  Subscription,
  SubscriptionInput,
  Transaction,
  TransactionInput,
} from "@/types";

interface FinanceState {
  initialized: boolean;
  hasHydrated: boolean;
  activeMonth: string;
  profile: Profile | null;
  accounts: Account[];
  transactions: Transaction[];
  emis: Emi[];
  budgets: Budget[];
  goals: SavingGoal[];
  subscriptions: Subscription[];
  notifications: AppNotification[];
  summaries: MonthlySummary[];

  bootstrap: (userId: string, fullName: string, email: string) => void;
  resetAll: () => void;
  setHydrated: (value: boolean) => void;
  updateProfile: (patch: Partial<Profile>) => void;

  addTransaction: (input: TransactionInput) => void;
  deleteTransaction: (id: string) => void;

  addAccount: (input: AccountInput) => void;
  updateAccount: (id: string, patch: Partial<Account>) => void;
  deleteAccount: (id: string) => void;

  addGoal: (input: GoalInput) => void;
  contributeToGoal: (id: string, amount: number) => void;
  deleteGoal: (id: string) => void;

  upsertBudget: (input: BudgetInput) => void;
  deleteBudget: (id: string) => void;

  addSubscription: (input: SubscriptionInput) => void;
  toggleSubscription: (id: string) => void;
  deleteSubscription: (id: string) => void;

  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;

  runMonthlyRollover: () => void;
}

const emptyState = {
  initialized: false,
  activeMonth: currentMonthKey(),
  profile: null,
  accounts: [],
  transactions: [],
  emis: [],
  budgets: [],
  goals: [],
  subscriptions: [],
  notifications: [],
  summaries: [],
};

const applyBalance = (
  accounts: Account[],
  accountId: string,
  delta: number,
): Account[] =>
  accounts.map((a) =>
    a.id === accountId ? { ...a, balance: Math.round((a.balance + delta) * 100) / 100 } : a,
  );

export const useFinanceStore = create<FinanceState>()(
  persist(
    (set, get) => ({
      ...emptyState,
      hasHydrated: false,

      bootstrap: (userId, fullName, email) => {
        if (get().initialized && get().profile) {
          get().runMonthlyRollover();
          return;
        }
        const seed = generateSeed(userId, fullName, email);
        set({
          initialized: true,
          activeMonth: currentMonthKey(),
          profile: seed.profile,
          accounts: seed.accounts,
          transactions: seed.transactions,
          emis: seed.emis,
          budgets: seed.budgets,
          goals: seed.goals,
          subscriptions: seed.subscriptions,
          notifications: seed.notifications,
          summaries: seed.summaries,
        });
      },

      resetAll: () => set({ ...emptyState, hasHydrated: true }),

      setHydrated: (value) => set({ hasHydrated: value }),

      updateProfile: (patch) =>
        set((s) => ({ profile: s.profile ? { ...s.profile, ...patch } : s.profile })),

      addTransaction: (input) =>
        set((s) => {
          const txn: Transaction = {
            id: createId("txn"),
            userId: s.profile?.id ?? "local",
            accountId: input.accountId,
            type: input.type,
            amount: input.amount,
            category: input.category,
            note: input.note ?? null,
            merchant: input.merchant ?? null,
            isBigExpense: input.isBigExpense ?? input.amount > BIG_EXPENSE_THRESHOLD,
            occurredAt: input.occurredAt,
            createdAt: isoNow(),
          };
          const delta = input.type === "income" ? input.amount : -input.amount;
          const budgets =
            input.type === "expense"
              ? s.budgets.map((b) =>
                  b.category === input.category && b.month === currentMonthKey()
                    ? { ...b, spent: Math.round((b.spent + input.amount) * 100) / 100 }
                    : b,
                )
              : s.budgets;
          return {
            transactions: [txn, ...s.transactions],
            accounts: applyBalance(s.accounts, input.accountId, delta),
            budgets,
          };
        }),

      deleteTransaction: (id) =>
        set((s) => {
          const txn = s.transactions.find((t) => t.id === id);
          if (!txn) return {};
          const delta = txn.type === "income" ? -txn.amount : txn.amount;
          const budgets =
            txn.type === "expense"
              ? s.budgets.map((b) =>
                  b.category === txn.category && b.month === monthKey(txn.occurredAt)
                    ? { ...b, spent: Math.max(0, Math.round((b.spent - txn.amount) * 100) / 100) }
                    : b,
                )
              : s.budgets;
          return {
            transactions: s.transactions.filter((t) => t.id !== id),
            accounts: applyBalance(s.accounts, txn.accountId, delta),
            budgets,
          };
        }),

      addAccount: (input) =>
        set((s) => {
          const account: Account = {
            id: createId("acc"),
            userId: s.profile?.id ?? "local",
            name: input.name,
            type: input.type,
            balance: input.balance,
            institution: input.institution ?? null,
            colorTag: input.colorTag,
            isPrimary: input.isPrimary ?? s.accounts.length === 0,
            createdAt: isoNow(),
          };
          const accounts = input.isPrimary
            ? s.accounts.map((a) => ({ ...a, isPrimary: false }))
            : s.accounts;
          return { accounts: [...accounts, account] };
        }),

      updateAccount: (id, patch) =>
        set((s) => ({
          accounts: s.accounts.map((a) => (a.id === id ? { ...a, ...patch } : a)),
        })),

      deleteAccount: (id) =>
        set((s) => ({ accounts: s.accounts.filter((a) => a.id !== id) })),

      addGoal: (input) =>
        set((s) => {
          const goal: SavingGoal = {
            id: createId("goal"),
            userId: s.profile?.id ?? "local",
            title: input.title,
            targetAmount: input.targetAmount,
            savedAmount: input.savedAmount ?? 0,
            deadline: input.deadline ?? null,
            status: "active",
            colorTag: input.colorTag,
            createdAt: isoNow(),
          };
          return { goals: [goal, ...s.goals] };
        }),

      contributeToGoal: (id, amount) =>
        set((s) => ({
          goals: s.goals.map((g) => {
            if (g.id !== id) return g;
            const savedAmount = Math.min(g.targetAmount, g.savedAmount + amount);
            return {
              ...g,
              savedAmount,
              status: savedAmount >= g.targetAmount ? "completed" : g.status,
            };
          }),
        })),

      deleteGoal: (id) => set((s) => ({ goals: s.goals.filter((g) => g.id !== id) })),

      upsertBudget: (input) =>
        set((s) => {
          const existing = s.budgets.find(
            (b) => b.category === input.category && b.month === input.month,
          );
          if (existing) {
            return {
              budgets: s.budgets.map((b) =>
                b.id === existing.id ? { ...b, limit: input.limit } : b,
              ),
            };
          }
          const spent = s.transactions
            .filter(
              (t) =>
                t.type === "expense" &&
                t.category === input.category &&
                monthKey(t.occurredAt) === input.month,
            )
            .reduce((acc, t) => acc + t.amount, 0);
          const budget: Budget = {
            id: createId("bud"),
            userId: s.profile?.id ?? "local",
            category: input.category,
            limit: input.limit,
            spent: Math.round(spent * 100) / 100,
            month: input.month,
            createdAt: isoNow(),
          };
          return { budgets: [...s.budgets, budget] };
        }),

      deleteBudget: (id) =>
        set((s) => ({ budgets: s.budgets.filter((b) => b.id !== id) })),

      addSubscription: (input) =>
        set((s) => {
          const sub: Subscription = {
            id: createId("sub"),
            userId: s.profile?.id ?? "local",
            name: input.name,
            amount: input.amount,
            cycle: input.cycle,
            category: input.category,
            nextChargeAt: input.nextChargeAt,
            isActive: true,
            createdAt: isoNow(),
          };
          return { subscriptions: [sub, ...s.subscriptions] };
        }),

      toggleSubscription: (id) =>
        set((s) => ({
          subscriptions: s.subscriptions.map((sub) =>
            sub.id === id ? { ...sub, isActive: !sub.isActive } : sub,
          ),
        })),

      deleteSubscription: (id) =>
        set((s) => ({
          subscriptions: s.subscriptions.filter((sub) => sub.id !== id),
        })),

      markNotificationRead: (id) =>
        set((s) => ({
          notifications: s.notifications.map((n) =>
            n.id === id ? { ...n, read: true } : n,
          ),
        })),

      markAllNotificationsRead: () =>
        set((s) => ({
          notifications: s.notifications.map((n) => ({ ...n, read: true })),
        })),

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
        const prevCarry = s.summaries.find((sum) => sum.month === prev)?.carriedForward ?? 0;
        const score = computeHealthScore({
          income,
          expenses,
          savings: saved,
          emiBurden,
          budgetAdherence: 70,
        });

        const summary: MonthlySummary = {
          id: createId("sum"),
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

        const newBudgets = s.budgets
          .filter((b) => b.month === prev)
          .map((b) => ({
            ...b,
            id: createId("bud"),
            spent: 0,
            month: current,
            createdAt: isoNow(),
          }));

        set({
          activeMonth: current,
          summaries,
          budgets: [...s.budgets, ...newBudgets],
        });
      },
    }),
    {
      name: APP.storageKeys.finance,
      storage: createJSONStorage(() => localStorage),
      partialize: ({ hasHydrated: _hasHydrated, ...rest }) => rest,
      onRehydrateStorage: () => (state) => state?.setHydrated(true),
    },
  ),
);
