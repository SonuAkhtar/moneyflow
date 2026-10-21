import { describe, expect, it } from "vitest";
import {
  EMPTY_FILTERS,
  activeFilterCount,
  filterTransactions,
  groupByMonth,
} from "./transactionFilters";
import type { Transaction } from "@/types";

const txn = (over: Partial<Transaction>): Transaction => ({
  id: Math.random().toString(36).slice(2),
  userId: "u",
  accountId: "a1",
  type: "expense",
  amount: 100,
  category: "food",
  note: null,
  merchant: null,
  isBigExpense: false,
  occurredAt: "2026-10-10T12:00:00.000Z",
  createdAt: "2026-10-10T12:00:00.000Z",
  ...over,
});

const data = [
  txn({
    id: "swiggy",
    merchant: "Swiggy",
    amount: 250,
    occurredAt: "2026-10-18T12:00:00.000Z",
  }),
  txn({
    id: "flight",
    merchant: "IndiGo",
    category: "travel",
    amount: 30000,
    isBigExpense: true,
    occurredAt: "2026-10-12T12:00:00.000Z",
  }),
  txn({
    id: "salary",
    type: "income",
    category: "salary",
    amount: 85000,
    note: "Salary",
    accountId: "a2",
    occurredAt: "2026-10-01T12:00:00.000Z",
  }),
  txn({
    id: "old",
    merchant: "Dominos",
    amount: 600,
    occurredAt: "2026-09-20T12:00:00.000Z",
  }),
];

const ids = (f: Partial<typeof EMPTY_FILTERS>) =>
  filterTransactions(data, { ...EMPTY_FILTERS, ...f }).map((t) => t.id);

describe("filterTransactions", () => {
  it("returns everything newest first with no filters", () => {
    expect(ids({})).toEqual(["swiggy", "flight", "salary", "old"]);
  });

  it("matches text against merchant, note, category label and amount", () => {
    expect(ids({ query: "swig" })).toEqual(["swiggy"]);
    expect(ids({ query: "salary" })).toEqual(["salary"]);
    expect(ids({ query: "travel" })).toEqual(["flight"]);
    expect(ids({ query: "600" })).toEqual(["old"]);
  });

  it("filters by type, kind, category and account", () => {
    expect(ids({ type: "income" })).toEqual(["salary"]);
    expect(ids({ kind: "major" })).toEqual(["flight"]);
    expect(ids({ kind: "daily" })).toEqual(["swiggy", "old"]);
    expect(ids({ category: "food" })).toEqual(["swiggy", "old"]);
    expect(ids({ accountId: "a2" })).toEqual(["salary"]);
  });

  it("filters by inclusive date and amount ranges", () => {
    expect(ids({ from: "2026-10-12", to: "2026-10-18" })).toEqual([
      "swiggy",
      "flight",
    ]);
    expect(ids({ minAmount: "250", maxAmount: "600" })).toEqual([
      "swiggy",
      "old",
    ]);
    expect(ids({ minAmount: "abc" })).toHaveLength(4);
  });
});

describe("activeFilterCount", () => {
  it("counts panel filters, treating each range as one", () => {
    expect(activeFilterCount(EMPTY_FILTERS)).toBe(0);
    expect(
      activeFilterCount({ ...EMPTY_FILTERS, query: "x", type: "income" }),
    ).toBe(0);
    expect(
      activeFilterCount({
        ...EMPTY_FILTERS,
        kind: "major",
        from: "2026-10-01",
        to: "2026-10-31",
        minAmount: "10",
      }),
    ).toBe(3);
  });
});

describe("groupByMonth", () => {
  it("buckets consecutive transactions by month", () => {
    const groups = groupByMonth(filterTransactions(data, EMPTY_FILTERS));
    expect(groups.map((g) => [g.month, g.items.length])).toEqual([
      ["2026-10", 3],
      ["2026-09", 1],
    ]);
  });
});
