import { describe, expect, it } from "vitest";
import {
  bankMonthFlow,
  computeHealthScore,
  monthKey,
  savingsRate,
  sumBy,
  SAVINGS_DEPOSIT_NOTE,
  SAVINGS_WITHDRAWAL_NOTE,
} from "@/utils";
import type { Transaction } from "@/types";

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
  it("returns a score within 0–100", () => {
    const score = computeHealthScore({
      income: 1000,
      expenses: 600,
      savings: 400,
      emiBurden: 100,
      budgetAdherence: 80,
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
      tx({ amount: 999, note: SAVINGS_DEPOSIT_NOTE, occurredAt: "2026-04-10T09:00:00.000Z" }),
    ];
    expect(bankMonthFlow("acc-1", txns, "2026-05")).toEqual({
      added: 1000,
      taken: 300,
      net: 700,
    });
  });
});
