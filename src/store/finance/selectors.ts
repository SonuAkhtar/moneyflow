import {
  SAVINGS_DEPOSIT_NOTE,
  emiKind,
  monthKey,
  round2,
  sumBy,
} from "@/utils";
import type { Emi, Transaction } from "@/types";

export interface MonthBuckets {
  all: Transaction[];
  income: Transaction[];
  expenses: Transaction[];
  transfers: Transaction[];
}

export interface MonthTotals {
  income: number;
  expenses: number;
  savingsDeposits: number;
}

export const monthBuckets = (
  transactions: Transaction[],
  month: string,
): MonthBuckets => {
  const all = transactions.filter((t) => monthKey(t.occurredAt) === month);
  return {
    all,
    income: all.filter((t) => t.type === "income"),
    expenses: all.filter((t) => t.type === "expense"),
    transfers: all.filter((t) => t.type === "transfer"),
  };
};

export const totalsOf = (buckets: MonthBuckets): MonthTotals => ({
  income: round2(sumBy(buckets.income, (t) => t.amount)),
  expenses: round2(sumBy(buckets.expenses, (t) => t.amount)),
  savingsDeposits: round2(
    sumBy(
      buckets.transfers.filter((t) => t.note === SAVINGS_DEPOSIT_NOTE),
      (t) => t.amount,
    ),
  ),
});

export const monthTotals = (
  transactions: Transaction[],
  month: string,
): MonthTotals => totalsOf(monthBuckets(transactions, month));

export const loanEmiPaidInMonth = (emis: Emi[], month: string): number =>
  round2(
    sumBy(
      emis.filter((e) => emiKind(e) === "loan"),
      (e) =>
        sumBy(
          (e.payments ?? []).filter((p) => p.month === month),
          (p) => p.amount,
        ),
    ),
  );

export const salaryTotalsByMonth = (
  transactions: Transaction[],
): Record<string, number> => {
  const map: Record<string, number> = {};
  for (const t of transactions) {
    if (t.type !== "income" || t.category !== "salary") continue;
    const key = monthKey(t.occurredAt);
    map[key] = round2((map[key] ?? 0) + t.amount);
  }
  return map;
};
