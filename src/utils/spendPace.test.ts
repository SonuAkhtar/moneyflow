import { describe, expect, it } from "vitest";
import { computeSpendPace } from "./spendPace";
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
  const today = new Date(2026, 9, 10, 15); // 10 Oct 2026
  const data = [
    t("2026-10-02T12:00:00", 100),
    t("2026-10-09T12:00:00", 50, { category: "travel" }),
    t("2026-10-12T12:00:00", 999), // future day this month: ignored
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
