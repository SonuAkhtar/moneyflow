"use client";

import { useMemo } from "react";
import { useFinanceStore } from "@/store/financeStore";
import { useMonthTransactions } from "./useMonthTransactions";
import { loanEmiPaidInMonth } from "@/store/finance/selectors";
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
  healthScore: number;
  healthBand: HealthBand;
  bigExpenseTotal: number;
  dailyAverage: number;
}

const daysElapsed = (month: string): number => {
  const current = currentMonthKey();
  if (month === current) return new Date().getDate();
  const [year, m] = month.split("-").map(Number);
  return new Date(year ?? 0, m ?? 1, 0).getDate();
};

export const useFinanceMetrics = (
  month: string = currentMonthKey(),
): FinanceMetrics => {
  const accounts = useFinanceStore((s) => s.accounts);
  const emis = useFinanceStore((s) => s.emis);
  const monthTxns = useMonthTransactions(month);

  return useMemo(() => {
    const { income, expenses } = monthTxns.totals;
    const emiBurden = sumBy(
      emis.filter((e) => e.status === "active" && emiKind(e) === "loan"),
      (e) => e.monthlyAmount,
    );
    const totalBalance = sumBy(accounts, (a) => a.balance);
    const emiPaid = loanEmiPaidInMonth(emis, month);
    const totalSpent = expenses + emiPaid;
    const saved = income - totalSpent;
    const score = computeHealthScore({
      income,
      expenses,
      savings: saved,
      emiBurden,
    });

    return {
      totalBalance: Math.round(totalBalance * 100) / 100,
      monthIncome: Math.round(income * 100) / 100,
      monthExpenses: Math.round(totalSpent * 100) / 100,
      monthSaved: Math.round(saved * 100) / 100,
      savingsRate:
        income > 0
          ? Math.round(Math.max(-100, Math.min(100, (saved / income) * 100)))
          : 0,
      emiBurden: Math.round(emiBurden * 100) / 100,
      healthScore: score,
      healthBand: healthBand(score),
      bigExpenseTotal: sumBy(
        monthTxns.expenses.filter((t) => t.isBigExpense),
        (t) => t.amount,
      ),
      dailyAverage:
        Math.round((expenses / Math.max(daysElapsed(month), 1)) * 100) / 100,
    };
  }, [accounts, emis, month, monthTxns]);
};
