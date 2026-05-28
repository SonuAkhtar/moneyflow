"use client";

import { useMemo } from "react";
import { useFinanceStore } from "@/store/financeStore";
import { currentMonthKey, monthKey } from "@/utils";
import {
  computeHealthScore,
  goalProgress,
  healthBand,
  savingsRate,
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
  goalsFunded: number;
  bigExpenseTotal: number;
  dailyAverage: number;
}

export const useFinanceMetrics = (): FinanceMetrics => {
  const accounts = useFinanceStore((s) => s.accounts);
  const transactions = useFinanceStore((s) => s.transactions);
  const emis = useFinanceStore((s) => s.emis);
  const budgets = useFinanceStore((s) => s.budgets);
  const goals = useFinanceStore((s) => s.goals);
  const summaries = useFinanceStore((s) => s.summaries);

  return useMemo(() => {
    const month = currentMonthKey();
    const monthTxns = transactions.filter((t) => monthKey(t.occurredAt) === month);
    const income = sumBy(
      monthTxns.filter((t) => t.type === "income"),
      (t) => t.amount,
    );
    const expenses = sumBy(
      monthTxns.filter((t) => t.type === "expense"),
      (t) => t.amount,
    );
    const emiBurden = sumBy(
      emis.filter((e) => e.status === "active"),
      (e) => e.monthlyAmount,
    );
    const totalBalance = sumBy(accounts, (a) => a.balance);
    const saved = Math.max(0, income - expenses);
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
    const dayOfMonth = new Date().getDate();

    return {
      totalBalance: Math.round(totalBalance * 100) / 100,
      monthIncome: Math.round(income * 100) / 100,
      monthExpenses: Math.round(expenses * 100) / 100,
      monthSaved: Math.round(saved * 100) / 100,
      savingsRate: Math.round(savingsRate(income, expenses)),
      emiBurden: Math.round(emiBurden * 100) / 100,
      carriedForward,
      healthScore: score,
      healthBand: healthBand(score),
      budgetTotal,
      budgetSpent: Math.round(budgetSpent * 100) / 100,
      goalsFunded: goals.length
        ? Math.round(
            goals.reduce((acc, g) => acc + goalProgress(g.savedAmount, g.targetAmount), 0) /
              goals.length,
          )
        : 0,
      bigExpenseTotal: sumBy(
        monthTxns.filter((t) => t.type === "expense" && t.isBigExpense),
        (t) => t.amount,
      ),
      dailyAverage: Math.round((expenses / Math.max(dayOfMonth, 1)) * 100) / 100,
    };
  }, [accounts, transactions, emis, budgets, goals, summaries]);
};
