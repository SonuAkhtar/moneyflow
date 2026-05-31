"use client";

import { useMemo } from "react";
import { useFinanceStore } from "@/store/financeStore";
import { useMonthTransactions } from "./useMonthTransactions";
import {
  computeHealthScore,
  currentMonthKey,
  emiKind,
  healthBand,
  sumBy,
} from "@/utils";
import type { HealthBand } from "@/types";

export interface FinanceMetrics {
  totalBalance: number;
  monthIncome: number;
  monthExpenses: number;
  monthSaved: number;
  savingsRate: number;
  emiBurden: number;
  carriedForward: number;
  healthScore: number;
  healthBand: HealthBand;
  budgetTotal: number;
  budgetSpent: number;
  bigExpenseTotal: number;
  dailyAverage: number;
}

const daysElapsed = (month: string): number => {
  const current = currentMonthKey();
  if (month === current) return new Date().getDate();
  const [year, m] = month.split("-").map(Number);
  return new Date(year ?? 0, m ?? 1, 0).getDate();
};

export const useFinanceMetrics = (month: string = currentMonthKey()): FinanceMetrics => {
  const accounts = useFinanceStore((s) => s.accounts);
  const emis = useFinanceStore((s) => s.emis);
  const budgets = useFinanceStore((s) => s.budgets);
  const summaries = useFinanceStore((s) => s.summaries);
  const monthTxns = useMonthTransactions(month);

  return useMemo(() => {
    const { income, expenses } = monthTxns.totals;
    const emiBurden = sumBy(
      emis.filter((e) => e.status === "active"),
      (e) => e.monthlyAmount,
    );
    const totalBalance = sumBy(accounts, (a) => a.balance);
    // EMI counts only once it's actually PAID — a payment logged on the EMI page
    // for this month — not the full scheduled monthly amount. SIP contributions
    // are excluded (they are savings, not spending).
    const emiPaid = sumBy(
      emis.filter((e) => emiKind(e) === "loan"),
      (e) =>
        sumBy(
          (e.payments ?? []).filter((p) => p.month === month),
          (p) => p.amount,
        ),
    );
    // "Spent" = expenses + EMIs paid this month; "Saved" = income − that.
    const totalSpent = expenses + emiPaid;
    const saved = Math.max(0, income - totalSpent);
    const monthBudgets = budgets.filter((b) => b.month === month);
    const budgetTotal = sumBy(monthBudgets, (b) => b.limit);
    const budgetSpent = sumBy(monthBudgets, (b) => b.spent);
    const adherence =
      budgetTotal > 0 ? Math.max(0, 100 - (budgetSpent / budgetTotal) * 100) : 60;
    const score = computeHealthScore({
      income: income || 1,
      expenses,
      savings: saved,
      emiBurden,
      budgetAdherence: adherence,
    });
    const carriedForward =
      summaries.find((sum) => sum.month === month)?.carriedForward ??
      summaries[0]?.carriedForward ??
      0;

    return {
      totalBalance: Math.round(totalBalance * 100) / 100,
      monthIncome: Math.round(income * 100) / 100,
      monthExpenses: Math.round(totalSpent * 100) / 100,
      monthSaved: Math.round(saved * 100) / 100,
      savingsRate:
        income > 0
          ? Math.round(Math.max(0, Math.min(100, (saved / income) * 100)))
          : 0,
      emiBurden: Math.round(emiBurden * 100) / 100,
      carriedForward,
      healthScore: score,
      healthBand: healthBand(score),
      budgetTotal,
      budgetSpent: Math.round(budgetSpent * 100) / 100,
      bigExpenseTotal: sumBy(
        monthTxns.expenses.filter((t) => t.isBigExpense),
        (t) => t.amount,
      ),
      dailyAverage:
        Math.round((expenses / Math.max(daysElapsed(month), 1)) * 100) / 100,
    };
  }, [accounts, emis, budgets, summaries, month, monthTxns]);
};
