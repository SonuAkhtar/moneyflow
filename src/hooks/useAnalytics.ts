"use client";

import { useMemo } from "react";
import { useFinanceStore } from "@/store/financeStore";
import { useMonthTransactions } from "./useMonthTransactions";
import { loanEmiPaidInMonth, monthTotals } from "@/store/finance/selectors";
import { getCategoryMeta } from "@/constants/categories";
import {
  currentMonthKey,
  shortMonthLabel,
  groupSum,
  lastNMonthKeys,
} from "@/utils";
import type { CategoryId } from "@/types";

export interface CategorySlice {
  id: CategoryId;
  label: string;
  value: number;
  color: string;
  share: number;
}

export interface TrendPoint {
  label: string;
  income: number;
  expenses: number;
  saved: number;
}

export interface AnalyticsData {
  categoryBreakdown: CategorySlice[];
  monthlyTrend: TrendPoint[];
  dailySpend: { label: string; value: number }[];
  topMerchants: { name: string; value: number; count: number }[];
}

export const useAnalytics = (
  month: string = currentMonthKey(),
): AnalyticsData => {
  const transactions = useFinanceStore((s) => s.transactions);
  const emis = useFinanceStore((s) => s.emis);
  const monthTxns = useMonthTransactions(month);

  return useMemo(() => {
    const monthExpenses = monthTxns.expenses;

    const byCategory = groupSum(
      monthExpenses,
      (t) => t.category,
      (t) => t.amount,
    );
    const totalSpend =
      Object.values(byCategory).reduce((a, b) => a + b, 0) || 1;
    const sortedEntries = Object.entries(byCategory)
      .map(([id, value]) => ({ id: id as CategoryId, value }))
      .sort((a, b) => b.value - a.value);
    const rawShares = sortedEntries.map((e) => (e.value / totalSpend) * 100);
    const shares = rawShares.map((s) => Math.floor(s));
    let remainder = Math.round(100 - shares.reduce((a, b) => a + b, 0));
    rawShares
      .map((s, i) => ({ i, frac: s - Math.floor(s) }))
      .sort((a, b) => b.frac - a.frac)
      .forEach(({ i }) => {
        if (remainder > 0) {
          shares[i] = (shares[i] ?? 0) + 1;
          remainder -= 1;
        }
      });
    const categoryBreakdown: CategorySlice[] = sortedEntries.map((e, i) => {
      const meta = getCategoryMeta(e.id);
      return {
        id: e.id,
        label: meta.label,
        value: Math.round(e.value * 100) / 100,
        color: meta.color,
        share: shares[i] ?? 0,
      };
    });

    const monthlyTrend: TrendPoint[] = lastNMonthKeys(6).map((key) => {
      const { income, expenses } = monthTotals(transactions, key);
      const spent = expenses + loanEmiPaidInMonth(emis, key);
      return {
        label: shortMonthLabel(`${key}-01`),
        income: Math.round(income),
        expenses: Math.round(spent),
        saved: Math.round(income - spent),
      };
    });

    const dayBuckets: Record<string, number> = {};
    monthExpenses.forEach((t) => {
      const day = String(new Date(t.occurredAt).getDate());
      dayBuckets[day] = (dayBuckets[day] ?? 0) + t.amount;
    });
    const dailySpend = Object.entries(dayBuckets)
      .map(([day, value]) => ({ label: day, value: Math.round(value) }))
      .sort((a, b) => Number(a.label) - Number(b.label));

    const merchantBuckets: Record<string, { value: number; count: number }> =
      {};
    monthExpenses.forEach((t) => {
      const key = t.merchant ?? getCategoryMeta(t.category).label;
      const entry = merchantBuckets[key] ?? { value: 0, count: 0 };
      entry.value += t.amount;
      entry.count += 1;
      merchantBuckets[key] = entry;
    });
    const topMerchants = Object.entries(merchantBuckets)
      .map(([name, { value, count }]) => ({
        name,
        value: Math.round(value),
        count,
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);

    return { categoryBreakdown, monthlyTrend, dailySpend, topMerchants };
  }, [transactions, emis, monthTxns]);
};
