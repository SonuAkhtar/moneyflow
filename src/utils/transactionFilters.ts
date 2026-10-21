import { getCategoryMeta } from "@/constants/categories";
import type { CategoryId, Transaction } from "@/types";
import { dateKey, monthKey } from "./index";

export type TxnTypeFilter = "all" | "income" | "expense" | "transfer";
export type TxnKindFilter = "all" | "major" | "daily";

export interface TransactionFilters {
  query: string;
  type: TxnTypeFilter;
  kind: TxnKindFilter;
  category: CategoryId | "all";
  accountId: string | "all";
  from: string;
  to: string;
  minAmount: string;
  maxAmount: string;
}

export const EMPTY_FILTERS: TransactionFilters = {
  query: "",
  type: "all",
  kind: "all",
  category: "all",
  accountId: "all",
  from: "",
  to: "",
  minAmount: "",
  maxAmount: "",
};

export const activeFilterCount = (f: TransactionFilters): number =>
  [
    f.kind !== "all",
    f.category !== "all",
    f.accountId !== "all",
    f.from !== "" || f.to !== "",
    f.minAmount !== "" || f.maxAmount !== "",
  ].filter(Boolean).length;

const toNumber = (raw: string): number | null => {
  if (raw.trim() === "") return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
};

export const filterTransactions = (
  transactions: Transaction[],
  f: TransactionFilters,
): Transaction[] => {
  const q = f.query.trim().toLowerCase();
  const min = toNumber(f.minAmount);
  const max = toNumber(f.maxAmount);

  return transactions
    .filter((t) => {
      if (f.type !== "all" && t.type !== f.type) return false;
      if (f.kind !== "all") {
        if (t.type !== "expense") return false;
        if (t.isBigExpense !== (f.kind === "major")) return false;
      }
      if (f.category !== "all" && t.category !== f.category) return false;
      if (f.accountId !== "all" && t.accountId !== f.accountId) return false;
      const day = dateKey(t.occurredAt);
      if (f.from && day < f.from) return false;
      if (f.to && day > f.to) return false;
      if (min !== null && t.amount < min) return false;
      if (max !== null && t.amount > max) return false;
      if (!q) return true;
      return (
        (t.note ?? "").toLowerCase().includes(q) ||
        (t.merchant ?? "").toLowerCase().includes(q) ||
        getCategoryMeta(t.category).label.toLowerCase().includes(q) ||
        String(t.amount).includes(q)
      );
    })
    .sort((a, b) => +new Date(b.occurredAt) - +new Date(a.occurredAt));
};

export interface MonthBucket {
  month: string;
  items: Transaction[];
}

/** Expects transactions sorted newest first. */
export const groupByMonth = (transactions: Transaction[]): MonthBucket[] => {
  const buckets: MonthBucket[] = [];
  for (const t of transactions) {
    const month = monthKey(t.occurredAt);
    const last = buckets[buckets.length - 1];
    if (last && last.month === month) last.items.push(t);
    else buckets.push({ month, items: [t] });
  }
  return buckets;
};
