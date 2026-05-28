"use client";

import { useMemo } from "react";
import { useFinanceStore } from "@/store/financeStore";
import { useFinanceMetrics } from "./useFinanceMetrics";
import { useAnalytics } from "./useAnalytics";
import { goalProgress } from "@/utils";
import type { AiFinancialSnapshot } from "@/types";

export const useAiSnapshot = (): AiFinancialSnapshot => {
  const metrics = useFinanceMetrics();
  const { categoryBreakdown } = useAnalytics();
  const profile = useFinanceStore((s) => s.profile);
  const emis = useFinanceStore((s) => s.emis);
  const goals = useFinanceStore((s) => s.goals);

  return useMemo(
    () => ({
      monthlySalary: profile?.monthlySalary ?? 0,
      totalBalance: metrics.totalBalance,
      monthIncome: metrics.monthIncome,
      monthExpenses: metrics.monthExpenses,
      monthSaved: metrics.monthSaved,
      carriedForward: metrics.carriedForward,
      healthScore: metrics.healthScore,
      topCategories: categoryBreakdown
        .slice(0, 3)
        .map((c) => ({ category: c.label, amount: c.value })),
      activeEmis: emis
        .filter((e) => e.status === "active")
        .map((e) => ({
          name: e.name,
          monthlyAmount: e.monthlyAmount,
          remainingMonths: e.remainingMonths,
        })),
      goals: goals
        .filter((g) => g.status === "active")
        .map((g) => ({
          title: g.title,
          progress: Math.round(goalProgress(g.savedAmount, g.targetAmount)),
        })),
    }),
    [metrics, categoryBreakdown, profile, emis, goals],
  );
};
