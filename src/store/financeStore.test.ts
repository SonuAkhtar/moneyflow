import { beforeEach, describe, expect, it, vi } from "vitest";
import { currentMonthKey } from "@/utils";
import type { Account, Budget, Profile } from "@/types";

// Repositories hit Supabase — stub them so mutations only exercise the
// optimistic local reducer logic (what the slice split must preserve).
vi.mock("@/services/repositories", () => {
  const ok = () => Promise.resolve();
  const repo = () => ({ list: () => Promise.resolve([]), save: vi.fn(ok), remove: vi.fn(ok) });
  return {
    accountRepo: repo(),
    transactionRepo: repo(),
    budgetRepo: repo(),
    emiRepo: {
      save: vi.fn(ok),
      remove: vi.fn(ok),
      savePayment: vi.fn(ok),
      removePayment: vi.fn(ok),
    },
    profileRepo: { get: () => Promise.resolve(null), update: vi.fn(ok) },
    fetchSnapshot: vi.fn(() =>
      Promise.resolve({
        profile: null,
        majorAccountId: null,
        dailyAccountId: null,
        accounts: [],
        transactions: [],
        emis: [],
        budgets: [],
      }),
    ),
  };
});

import { useFinanceStore } from "@/store/financeStore";

const profile: Profile = {
  id: "u1",
  email: "a@b.c",
  username: null,
  fullName: "A",
  phone: null,
  avatarUrl: null,
  currency: "INR",
  monthlySalary: 0,
  savingsTarget: 0,
  onboardingComplete: true,
  streakCount: 0,
  createdAt: "",
  updatedAt: "",
};

const account = (balance: number): Account => ({
  id: "acc1",
  userId: "u1",
  name: "Main",
  type: "bank",
  balance,
  institution: null,
  colorTag: "#fff",
  isPrimary: true,
  createdAt: "",
});

const seed = (over: Partial<Parameters<typeof useFinanceStore.setState>[0]> = {}) =>
  useFinanceStore.setState({
    profile,
    accounts: [account(1000)],
    transactions: [],
    emis: [],
    budgets: [],
    summaries: [],
    hasHydrated: true,
    initialized: true,
    ...over,
  });

beforeEach(() => seed());

describe("financeStore mutations (optimistic reducer)", () => {
  it("addTransaction(expense) decrements balance and bumps the matching budget", () => {
    const month = currentMonthKey();
    const budget: Budget = {
      id: "b1",
      userId: "u1",
      category: "food",
      limit: 5000,
      spent: 100,
      month,
      createdAt: "",
    };
    seed({ budgets: [budget] });

    useFinanceStore.getState().addTransaction({
      accountId: "acc1",
      type: "expense",
      amount: 200,
      category: "food",
      occurredAt: new Date().toISOString(),
    });

    const s = useFinanceStore.getState();
    expect(s.transactions).toHaveLength(1);
    expect(s.accounts[0]!.balance).toBe(800);
    expect(s.budgets[0]!.spent).toBe(300);
  });

  it("deleteTransaction reverses the balance + budget effect", () => {
    const month = currentMonthKey();
    seed({
      budgets: [
        { id: "b1", userId: "u1", category: "food", limit: 5000, spent: 100, month, createdAt: "" },
      ],
    });
    const store = useFinanceStore.getState();
    store.addTransaction({
      accountId: "acc1",
      type: "expense",
      amount: 200,
      category: "food",
      occurredAt: new Date().toISOString(),
    });
    const id = useFinanceStore.getState().transactions[0]!.id;
    useFinanceStore.getState().deleteTransaction(id);

    const s = useFinanceStore.getState();
    expect(s.transactions).toHaveLength(0);
    expect(s.accounts[0]!.balance).toBe(1000);
    expect(s.budgets[0]!.spent).toBe(100);
  });

  it("addTransaction(income) increases balance", () => {
    seed({ accounts: [account(0)] });
    useFinanceStore.getState().addTransaction({
      accountId: "acc1",
      type: "income",
      amount: 500,
      category: "other",
      occurredAt: new Date().toISOString(),
    });
    expect(useFinanceStore.getState().accounts[0]!.balance).toBe(500);
  });

  it("setSalary creates a salary income txn and credits the account", () => {
    seed({ accounts: [account(0)] });
    useFinanceStore.getState().setSalary(currentMonthKey(), 5000);
    const s = useFinanceStore.getState();
    expect(
      s.transactions.some((t) => t.category === "salary" && t.amount === 5000),
    ).toBe(true);
    expect(s.accounts[0]!.balance).toBe(5000);
  });

  it("addSavingDeposit records a transfer and raises the balance", () => {
    seed({ accounts: [account(100)] });
    useFinanceStore.getState().addSavingDeposit("acc1", 400);
    const s = useFinanceStore.getState();
    expect(s.accounts[0]!.balance).toBe(500);
    expect(s.transactions[0]!.type).toBe("transfer");
  });

  it("updateTransaction re-bases balance + budget by the delta", () => {
    const month = currentMonthKey();
    seed({
      budgets: [
        { id: "b1", userId: "u1", category: "food", limit: 5000, spent: 100, month, createdAt: "" },
      ],
    });
    const store = useFinanceStore.getState();
    store.addTransaction({
      accountId: "acc1",
      type: "expense",
      amount: 200,
      category: "food",
      occurredAt: new Date().toISOString(),
    });
    const id = useFinanceStore.getState().transactions[0]!.id;
    store.updateTransaction(id, {
      accountId: "acc1",
      type: "expense",
      amount: 300,
      category: "food",
      occurredAt: new Date().toISOString(),
    });
    const s = useFinanceStore.getState();
    expect(s.accounts[0]!.balance).toBe(700); // 1000 − 300
    expect(s.budgets[0]!.spent).toBe(400); // 100 + 300
  });

  it("addEmi + addEmiPayment nests the payment under the EMI", () => {
    seed();
    const store = useFinanceStore.getState();
    store.addEmi({
      name: "Laptop Loan",
      kind: "loan",
      startMonth: currentMonthKey(),
      principal: 1000,
      monthlyAmount: 100,
      totalMonths: 12,
      remainingMonths: 12,
      paidMonths: 0,
      interestRate: 10,
      dueDay: 5,
    });
    const emiId = useFinanceStore.getState().emis[0]!.id;
    store.addEmiPayment(emiId, { month: currentMonthKey(), amount: 100 });

    const emi = useFinanceStore.getState().emis.find((e) => e.id === emiId)!;
    expect(emi.name).toBe("Laptop Loan");
    expect(emi.payments).toHaveLength(1);
    expect(emi.payments[0]!.amount).toBe(100);
  });
});
