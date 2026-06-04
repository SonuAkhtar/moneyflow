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

export const useMonthTransactions = (
  month: string = currentMonthKey(),
): MonthTransactions => {
  const transactions = useFinanceStore((s) => s.transactions);

  return useMemo(() => {
    const buckets = monthBuckets(transactions, month);
    return { month, ...buckets, totals: totalsOf(buckets) };
  }, [transactions, month]);
};
