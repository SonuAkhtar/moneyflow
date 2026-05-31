"use client";

import { useMemo } from "react";
import { useFinanceStore } from "@/store/financeStore";
import { useMonthTransactions } from "./useMonthTransactions";
import { getCategoryMeta } from "@/constants/categories";
import {
  currentMonthKey,
  monthKey,
  shortMonthLabel,
  groupSum,
  lastNMonthKeys,
  monthLabel,
  SAVINGS_DEPOSIT_NOTE,
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

export const useAnalytics = (month: string = currentMonthKey()): AnalyticsData => {
  const transactions = useFinanceStore((s) => s.transactions);
  const monthTxns = useMonthTransactions(month);

  return useMemo(() => {
    // This month's expenses come pre-filtered from the shared hook.
    const monthExpenses = monthTxns.expenses;

    const byCategory = groupSum(
      monthExpenses,
      (t) => t.category,
      (t) => t.amount,
    );
    const totalSpend = Object.values(byCategory).reduce((a, b) => a + b, 0) || 1;
    const categoryBreakdown: CategorySlice[] = Object.entries(byCategory)
      .map(([id, value]) => {
        const meta = getCategoryMeta(id as CategoryId);
        return {
          id: id as CategoryId,
          label: meta.label,
          value: Math.round(value * 100) / 100,
          color: meta.color,
          share: Math.round((value / totalSpend) * 100),
        };
      })
      .sort((a, b) => b.value - a.value);

    const monthlyTrend: TrendPoint[] = lastNMonthKeys(6).map((key) => {
      const income = transactions
        .filter((t) => t.type === "income" && monthKey(t.occurredAt) === key)
        .reduce((a, t) => a + t.amount, 0);
      const expenses = transactions
        .filter((t) => t.type === "expense" && monthKey(t.occurredAt) === key)
        .reduce((a, t) => a + t.amount, 0);
      const deposits = transactions
        .filter(
          (t) =>
            t.type === "transfer" &&
            t.note === SAVINGS_DEPOSIT_NOTE &&
            monthKey(t.occurredAt) === key,
        )
        .reduce((a, t) => a + t.amount, 0);
      return {
        label: shortMonthLabel(`${key}-01`),
        income: Math.round(income),
        expenses: Math.round(expenses),
        saved: Math.round(Math.max(0, income - expenses) + deposits),
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

    const merchantBuckets: Record<string, { value: number; count: number }> = {};
    monthExpenses.forEach((t) => {
      const key = t.merchant ?? getCategoryMeta(t.category).label;
      const entry = merchantBuckets[key] ?? { value: 0, count: 0 };
      entry.value += t.amount;
      entry.count += 1;
      merchantBuckets[key] = entry;
    });
    const topMerchants = Object.entries(merchantBuckets)
      .map(([name, { value, count }]) => ({ name, value: Math.round(value), count }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);

    return { categoryBreakdown, monthlyTrend, dailySpend, topMerchants };
  }, [transactions, monthTxns]);
};

export const currentMonthTitle = (): string => monthLabel(currentMonthKey());
