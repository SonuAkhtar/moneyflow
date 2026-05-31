import { describe, expect, it } from "vitest";
import {
  loanEmiPaidInMonth,
  monthTotals,
  salaryTotalsByMonth,
} from "./selectors";
import { SAVINGS_DEPOSIT_NOTE, SAVINGS_WITHDRAWAL_NOTE } from "@/utils";
import type { Emi, Transaction } from "@/types";

const tx = (over: Partial<Transaction>): Transaction => ({
  id: crypto.randomUUID(),
  userId: "u",
  accountId: "acc",
  type: "expense",
  amount: 0,
  category: "food",
  note: null,
  merchant: null,
  isBigExpense: false,
  occurredAt: "2026-05-10T09:00:00.000Z",
  createdAt: "2026-05-10T09:00:00.000Z",
  ...over,
});

const emi = (over: Partial<Emi>): Emi => ({
  id: crypto.randomUUID(),
  userId: "u",
  accountId: null,
  name: "Loan",
  kind: "loan",
  startMonth: "2026-01",
  principal: 0,
  monthlyAmount: 100,
  remainingMonths: 0,
  totalMonths: 12,
  paidMonths: 0,
  interestRate: 0,
  dueDay: 5,
  status: "active",
  payments: [],
  createdAt: "",
  ...over,
});

describe("monthTotals", () => {
  it("sums income/expenses/savings-deposits for the month only", () => {
    const txns = [
      tx({ type: "income", amount: 1000, category: "salary" }),
      tx({ type: "expense", amount: 200 }),
      tx({ type: "expense", amount: 50 }),
      tx({ type: "transfer", category: "transfer", amount: 300, note: SAVINGS_DEPOSIT_NOTE }),
      tx({ type: "transfer", category: "transfer", amount: 99, note: SAVINGS_WITHDRAWAL_NOTE }),
      tx({ type: "income", amount: 500, occurredAt: "2026-04-01T09:00:00.000Z" }),
    ];
    expect(monthTotals(txns, "2026-05")).toEqual({
      income: 1000,
      expenses: 250,
      savingsDeposits: 300,
    });
  });
});

describe("loanEmiPaidInMonth", () => {
  it("sums loan payments in the month and ignores SIPs + other months", () => {
    const emis = [
      emi({
        payments: [
          { id: "p1", month: "2026-05", amount: 100 },
          { id: "p2", month: "2026-04", amount: 100 },
        ],
      }),
      emi({ kind: "sip", payments: [{ id: "p3", month: "2026-05", amount: 5000 }] }),
    ];
    expect(loanEmiPaidInMonth(emis, "2026-05")).toBe(100);
  });
});

describe("salaryTotalsByMonth", () => {
  it("groups only salary income by month-key", () => {
    const txns = [
      tx({ type: "income", category: "salary", amount: 85000, occurredAt: "2026-05-01T09:00:00.000Z" }),
      tx({ type: "income", category: "salary", amount: 5000, occurredAt: "2026-05-15T09:00:00.000Z" }),
      tx({ type: "income", category: "salary", amount: 80000, occurredAt: "2026-04-01T09:00:00.000Z" }),
      tx({ type: "income", category: "other", amount: 999, occurredAt: "2026-05-01T09:00:00.000Z" }),
    ];
    expect(salaryTotalsByMonth(txns)).toEqual({ "2026-05": 90000, "2026-04": 80000 });
  });
});
