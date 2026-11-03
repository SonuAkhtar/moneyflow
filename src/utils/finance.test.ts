import { describe, expect, it } from "vitest";
import {
  accountMonthDelta,
  bankMonthFlow,
  computeHealthScore,
  currentStreak,
  emiAmountFor,
  emiPaidAmount,
  emiScheduledAmount,
  formatCurrency,
  getCurrencySymbol,
  monthKey,
  setActiveCurrency,
  sumBy,
  suggestedEmi,
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

describe("computeHealthScore", () => {
  it("returns a score within 0-100", () => {
    const score = computeHealthScore({
      income: 1000,
      savings: 400,
      emiBurden: 100,
    });
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
  });

  it("doesn't penalise EMIs when there is no income and no EMI", () => {
    expect(computeHealthScore({ income: 0, savings: 0, emiBurden: 0 })).toBe(
      40,
    );
    expect(computeHealthScore({ income: 0, savings: 0, emiBurden: 500 })).toBe(
      0,
    );
  });
});

describe("formatCurrency", () => {
  it("shows both decimals for fractional amounts", () => {
    expect(formatCurrency(12.5, "USD")).toBe("$12.50");
    expect(formatCurrency(12, "USD")).toBe("$12");
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
      transferIn: 0,
      transferOut: 0,
      net: 700,
      transferNet: 0,
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

  it("includes salary income credited to the account", () => {
    const txns = [tx({ type: "income", category: "salary", amount: 5000 })];
    expect(accountMonthDelta("acc-1", txns, "2026-05")).toBe(5000);
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
    amountChanges: [],
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

  it("for a loan, sums each paid month's EMI across amount changes", () => {
    const loan = emi({
      kind: "loan",
      monthlyAmount: 2000,
      paidMonths: 4,
      totalMonths: 12,
      amountChanges: [{ from: "2026-03", amount: 2500 }],
    });
    expect(emiPaidAmount(loan)).toBe(2000 + 2000 + 2500 + 2500);
    expect(emiScheduledAmount(loan, 12)).toBe(2 * 2000 + 10 * 2500);
  });
});

describe("emiAmountFor", () => {
  const base: Emi = {
    id: "e1",
    userId: "u",
    accountId: null,
    name: "Home Loan",
    kind: "loan",
    startMonth: "2026-01",
    principal: 0,
    monthlyAmount: 1000,
    remainingMonths: 12,
    totalMonths: 12,
    paidMonths: 0,
    interestRate: 0,
    dueDay: 5,
    status: "active",
    amountChanges: [],
    payments: [],
    createdAt: "",
  };

  it("uses the monthly amount when there are no changes", () => {
    expect(emiAmountFor(base, "2026-06")).toBe(1000);
  });

  it("uses the latest change on or before the month, in any order", () => {
    const loan: Emi = {
      ...base,
      amountChanges: [
        { from: "2026-09", amount: 1300 },
        { from: "2026-04", amount: 1200 },
      ],
    };
    expect(emiAmountFor(loan, "2026-03")).toBe(1000);
    expect(emiAmountFor(loan, "2026-04")).toBe(1200);
    expect(emiAmountFor(loan, "2026-08")).toBe(1200);
    expect(emiAmountFor(loan, "2026-12")).toBe(1300);
  });
});

describe("suggestedEmi", () => {
  it("applies the amortisation formula", () => {
    expect(suggestedEmi(100000, 12, 12)).toBe(8885);
    expect(suggestedEmi(500000, 8.5, 60)).toBe(10258);
  });

  it("splits evenly at 0% and returns 0 for missing inputs", () => {
    expect(suggestedEmi(120000, 0, 12)).toBe(10000);
    expect(suggestedEmi(0, 10, 12)).toBe(0);
    expect(suggestedEmi(100000, 10, 0)).toBe(0);
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
