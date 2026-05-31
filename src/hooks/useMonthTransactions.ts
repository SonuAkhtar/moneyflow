"use client";

import { useMemo } from "react";
import { useFinanceStore } from "@/store/financeStore";
import {
  monthBuckets,
  totalsOf,
  type MonthTotals,
} from "@/store/finance/selectors";
import { currentMonthKey } from "@/utils";
import type { Transaction } from "@/types";

export interface MonthTransactions {
  month: string;
  all: Transaction[];
  income: Transaction[];
  expenses: Transaction[];
  transfers: Transaction[];
  totals: MonthTotals;
}

// Single source of truth for "this month's transactions" — partitioned by type
// and pre-summed. Memoized once so callers (metrics, analytics) don't each
// re-filter the full transaction list.
export const useMonthTransactions = (
  month: string = currentMonthKey(),
): MonthTransactions => {
  const transactions = useFinanceStore((s) => s.transactions);

  return useMemo(() => {
    const buckets = monthBuckets(transactions, month);
    return { month, ...buckets, totals: totalsOf(buckets) };
  }, [transactions, month]);
};
