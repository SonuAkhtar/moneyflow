"use client";

import { useMemo } from "react";
import { useFinanceStore } from "@/store/financeStore";
import { currentMonthKey, monthKey, sumBy, SAVINGS_DEPOSIT_NOTE } from "@/utils";
import type { Transaction } from "@/types";

export interface MonthTransactions {
  month: string;
  all: Transaction[];
  income: Transaction[];
  expenses: Transaction[];
  transfers: Transaction[];
  totals: { income: number; expenses: number; savingsDeposits: number };
}

// Single source of truth for "this month's transactions" — partitioned by type
// and pre-summed. Memoized once so callers (metrics, analytics) don't each
// re-filter the full transaction list.
export const useMonthTransactions = (
  month: string = currentMonthKey(),
): MonthTransactions => {
  const transactions = useFinanceStore((s) => s.transactions);

  return useMemo(() => {
    const all = transactions.filter((t) => monthKey(t.occurredAt) === month);
    const income = all.filter((t) => t.type === "income");
    const expenses = all.filter((t) => t.type === "expense");
    const transfers = all.filter((t) => t.type === "transfer");
    const savingsDeposits = sumBy(
      transfers.filter((t) => t.note === SAVINGS_DEPOSIT_NOTE),
      (t) => t.amount,
    );
    return {
      month,
      all,
      income,
      expenses,
      transfers,
      totals: {
        income: sumBy(income, (t) => t.amount),
        expenses: sumBy(expenses, (t) => t.amount),
        savingsDeposits,
      },
    };
  }, [transactions, month]);
};
