import { describe, expect, it } from "vitest";
import {
  accountMonthDelta,
  bankMonthFlow,
  computeHealthScore,
  currentStreak,
  emiPaidAmount,
  getCurrencySymbol,
  monthKey,
  savingsRate,
  setActiveCurrency,
  sumBy,
  SAVINGS_DEPOSIT_NOTE,
  SAVINGS_WITHDRAWAL_NOTE,
} from "@/utils";
import type { Emi, EmiPayment, Transaction } from "@/types";

const daysAgoIso = (n: number): string => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
};

describe("sumBy", () => {
  it("sums a selector over a list", () => {
    expect(sumBy([{ n: 2 }, { n: 3 }, { n: 5 }], (x) => x.n)).toBe(10);
  });
  it("returns 0 for an empty list", () => {
    expect(sumBy([], (x: { n: number }) => x.n)).toBe(0);
  });
});

describe("monthKey", () => {
  it("formats an ISO date to YYYY-MM", () => {
    expect(monthKey("2026-05-17T09:00:00.000Z")).toBe("2026-05");
  });
});

describe("savingsRate", () => {
  it("is the saved share of income as a percent", () => {
    expect(savingsRate(1000, 750)).toBe(25);
  });
  it("is 0 when there is no income", () => {
    expect(savingsRate(0, 500)).toBe(0);
  });
});

describe("computeHealthScore", () => {
  it("returns a score within 0-100", () => {
    const score = computeHealthScore({
      income: 1000,
      expenses: 600,
      savings: 400,
      emiBurden: 100,
    });
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
  });
});

describe("bankMonthFlow", () => {
  const tx = (over: Partial<Transaction>): Transaction => ({
    id: crypto.randomUUID(),
    userId: "u",
    accountId: "acc-1",
    type: "transfer",
    amount: 0,
    category: "transfer",
    note: null,
    merchant: null,
    isBigExpense: false,
    occurredAt: "2026-05-10T09:00:00.000Z",
    createdAt: "2026-05-10T09:00:00.000Z",
    ...over,
  });

  it("nets deposits against withdrawals for the account + month", () => {
    const txns = [
      tx({ amount: 1000, note: SAVINGS_DEPOSIT_NOTE }),
      tx({ amount: 300, note: SAVINGS_WITHDRAWAL_NOTE }),
      tx({ amount: 999, note: SAVINGS_DEPOSIT_NOTE, accountId: "other" }),
      tx({
        amount: 999,
        note: SAVINGS_DEPOSIT_NOTE,
        occurredAt: "2026-04-10T09:00:00.000Z",
      }),
    ];
    expect(bankMonthFlow("acc-1", txns, "2026-05")).toEqual({
      added: 1000,
      taken: 300,
      net: 700,
    });
  });
});

describe("accountMonthDelta", () => {
  const tx = (over: Partial<Transaction>): Transaction => ({
    id: crypto.randomUUID(),
    userId: "u",
    accountId: "acc-1",
    type: "expense",
    amount: 0,
    category: "other",
    note: null,
    merchant: null,
    isBigExpense: false,
    occurredAt: "2026-05-10T09:00:00.000Z",
    createdAt: "2026-05-10T09:00:00.000Z",
    ...over,
  });

  it("nets all balance-affecting movements for the account + month", () => {
    const txns = [
      tx({ type: "income", category: "other", amount: 1000 }),
      tx({ type: "expense", amount: 250 }),
      tx({ type: "transfer", note: SAVINGS_DEPOSIT_NOTE, amount: 500 }),
      tx({ type: "transfer", note: SAVINGS_WITHDRAWAL_NOTE, amount: 100 }),
    ];
    expect(accountMonthDelta("acc-1", txns, "2026-05")).toBe(1150);
  });

  it("excludes salary income (recorded but never credited to a balance)", () => {
    const txns = [tx({ type: "income", category: "salary", amount: 5000 })];
    expect(accountMonthDelta("acc-1", txns, "2026-05")).toBe(0);
  });

  it("ignores other accounts and other months", () => {
    const txns = [
      tx({ type: "expense", amount: 100, accountId: "other" }),
      tx({
        type: "expense",
        amount: 100,
        occurredAt: "2026-04-10T09:00:00.000Z",
      }),
    ];
    expect(accountMonthDelta("acc-1", txns, "2026-05")).toBe(0);
  });
});

describe("emiPaidAmount", () => {
  const payment = (amount: number): EmiPayment => ({
    id: crypto.randomUUID(),
    month: "2026-05",
    paidOn: "2026-05-10",
    amount,
    accountId: null,
  });
  const emi = (over: Partial<Emi>): Emi => ({
    id: "e1",
    userId: "u",
    accountId: null,
    name: "Plan",
    kind: "sip",
    startMonth: "2026-01",
    principal: 0,
    monthlyAmount: 1000,
    remainingMonths: 0,
    totalMonths: 0,
    paidMonths: 0,
    interestRate: 0,
    dueDay: 5,
    status: "active",
    payments: [],
    createdAt: "",
    ...over,
  });

  it("for a SIP, sums the opening principal plus logged payments", () => {
    const sip = emi({
      kind: "sip",
      principal: 5000,
      payments: [payment(1000), payment(1000)],
    });
    expect(emiPaidAmount(sip)).toBe(7000);
  });

  it("for a loan, multiplies paid months by the monthly amount", () => {
    const loan = emi({
      kind: "loan",
      monthlyAmount: 2000,
      paidMonths: 3,
      totalMonths: 12,
    });
    expect(emiPaidAmount(loan)).toBe(6000);
  });
});

describe("currentStreak", () => {
  const tx = (occurredAt: string): Transaction => ({
    id: crypto.randomUUID(),
    userId: "u",
    accountId: "acc-1",
    type: "expense",
    amount: 1,
    category: "food",
    note: null,
    merchant: null,
    isBigExpense: false,
    occurredAt,
    createdAt: occurredAt,
  });

  it("counts consecutive active days ending today", () => {
    expect(currentStreak([tx(daysAgoIso(0)), tx(daysAgoIso(1))])).toBe(2);
  });

  it("breaks the streak on a gap", () => {
    expect(currentStreak([tx(daysAgoIso(5))])).toBe(0);
  });

  it("is 0 with no transactions", () => {
    expect(currentStreak([])).toBe(0);
  });
});

describe("getCurrencySymbol / setActiveCurrency", () => {
  it("derives the symbol from the active currency", () => {
    setActiveCurrency("USD");
    expect(getCurrencySymbol()).toBe("$");
    setActiveCurrency("INR");
    expect(getCurrencySymbol()).toBe("₹");
  });

  it("accepts an explicit currency code", () => {
    expect(getCurrencySymbol("EUR")).toBe("€");
    setActiveCurrency("INR");
  });
});
