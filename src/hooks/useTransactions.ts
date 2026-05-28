"use client";

import { useMemo, useState } from "react";
import { useFinanceStore } from "@/store/financeStore";
import { getCategoryMeta } from "@/constants/categories";
import { currentMonthKey, monthKey } from "@/utils";
import type { CategoryId, Transaction, TransactionType } from "@/types";

export interface TransactionFilter {
  search: string;
  type: TransactionType | "all";
  category: CategoryId | "all";
  monthOnly: boolean;
}

const DEFAULT_FILTER: TransactionFilter = {
  search: "",
  type: "all",
  category: "all",
  monthOnly: false,
};

export const useTransactions = (initial?: Partial<TransactionFilter>) => {
  const transactions = useFinanceStore((s) => s.transactions);
  const [filter, setFilter] = useState<TransactionFilter>({
    ...DEFAULT_FILTER,
    ...initial,
  });

  const filtered = useMemo(() => {
    const month = currentMonthKey();
    const query = filter.search.trim().toLowerCase();
    return transactions
      .filter((t) => {
        if (filter.monthOnly && monthKey(t.occurredAt) !== month) return false;
        if (filter.type !== "all" && t.type !== filter.type) return false;
        if (filter.category !== "all" && t.category !== filter.category) return false;
        if (query) {
          const haystack = `${t.merchant ?? ""} ${t.note ?? ""} ${getCategoryMeta(t.category).label}`.toLowerCase();
          if (!haystack.includes(query)) return false;
        }
        return true;
      })
      .sort((a, b) => +new Date(b.occurredAt) - +new Date(a.occurredAt));
  }, [transactions, filter]);

  const grouped = useMemo(() => groupByDay(filtered), [filtered]);

  return { filter, setFilter, filtered, grouped };
};

const groupByDay = (items: Transaction[]): { day: string; items: Transaction[] }[] => {
  const map = new Map<string, Transaction[]>();
  items.forEach((t) => {
    const day = t.occurredAt.slice(0, 10);
    const list = map.get(day) ?? [];
    list.push(t);
    map.set(day, list);
  });
  return Array.from(map.entries()).map(([day, list]) => ({ day, items: list }));
};
