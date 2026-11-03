import { describe, expect, it } from "vitest";
import { computeBudgetStatus, computeSpendPace } from "./spendPace";
import type { Transaction } from "@/types";

const t = (
  occurredAt: string,
  amount: number,
  over: Partial<Transaction> = {},
): Transaction => ({
  id: `${occurredAt}-${amount}`,
  userId: "u",
  accountId: "a",
  type: "expense",
  amount,
  category: "food",
  note: null,
  merchant: null,
  isBigExpense: false,
  occurredAt,
  createdAt: occurredAt,
  ...over,
});

describe("computeSpendPace", () => {
  const today = new Date(2026, 9, 10, 15);
  const data = [
    t("2026-10-02T12:00:00", 100),
    t("2026-10-09T12:00:00", 50, { category: "travel" }),
    t("2026-10-12T12:00:00", 999),
    t("2026-09-05T12:00:00", 300),
    t("2026-09-20T12:00:00", 700),
    t("2026-10-03T12:00:00", 5000, { type: "income", category: "salary" }),
  ];

  it("builds cumulative series and compares with the same day last month", () => {
    const pace = computeSpendPace(data, {}, today);
    expect(pace.thisMonth).toHaveLength(10);
    expect(pace.thisMonth[0]).toBe(0);
    expect(pace.thisMonth[1]).toBe(100);
    expect(pace.spentSoFar).toBe(150);
    expect(pace.lastMonth).toHaveLength(30);
    expect(pace.lastMonthSameDay).toBe(300);
    expect(pace.lastMonth[29]).toBe(1000);
  });

  it("totals only budgeted categories", () => {
    const pace = computeSpendPace(data, { food: 400, travel: 0 }, today);
    expect(pace.budgetTotal).toBe(400);
    expect(pace.budgetSpent).toBe(1099);
  });
});

describe("computeBudgetStatus", () => {
  const budget = { daily: 15000, major: 20000, dailySince: null };
  const on = (day: number) => new Date(2026, 10, day, 15);
  const nov = (day: number) =>
    `2026-11-${String(day).padStart(2, "0")}T12:00:00`;

  it("carries unspent money forward and goes negative when overspent", () => {
    expect(computeBudgetStatus(budget, [], on(1)).todayLeft).toBe(500);
    const spent = [t(nov(1), 300)];
    expect(computeBudgetStatus(budget, spent, on(2)).todayLeft).toBe(700);
    spent.push(t(nov(2), 1000));
    expect(computeBudgetStatus(budget, spent, on(2)).todayLeft).toBe(-300);
    expect(computeBudgetStatus(budget, spent, on(3)).todayLeft).toBe(200);
  });

  it("keeps major spends in a separate monthly pot", () => {
    const s = computeBudgetStatus(
      budget,
      [t(nov(2), 12000, { isBigExpense: true, category: "travel" })],
      on(5),
    );
    expect(s.todayLeft).toBe(2500);
    expect(s.majorLeft).toBe(8000);
  });

  it("ignores rent, bills, income and other months", () => {
    const s = computeBudgetStatus(
      budget,
      [
        t(nov(1), 9000, { category: "rent", isBigExpense: true }),
        t(nov(1), 800, { category: "bills" }),
        t(nov(1), 5000, { type: "income", category: "salary" }),
        t("2026-10-31T12:00:00", 400),
      ],
      on(1),
    );
    expect(s.todayLeft).toBe(500);
    expect(s.majorLeft).toBe(20000);
  });

  it("counts a limit set mid-month from that day", () => {
    const s = computeBudgetStatus(
      { ...budget, dailySince: "2026-11-21" },
      [t(nov(5), 2000), t(nov(21), 100)],
      on(21),
    );
    expect(s.dailyShare).toBe(1500);
    expect(s.todayLeft).toBe(1400);
  });

  it("starts each month fresh", () => {
    const s = computeBudgetStatus(
      { ...budget, dailySince: "2026-10-20" },
      [t("2026-10-25T12:00:00", 5000, { isBigExpense: true })],
      on(1),
    );
    expect(s.todayLeft).toBe(500);
    expect(s.majorLeft).toBe(20000);
  });
});
