import { getDate, getDaysInMonth, parseISO, subMonths } from "date-fns";
import type { CategoryId, Transaction } from "@/types";
import { monthKey } from "./index";

export interface SpendPace {
  thisMonth: number[];
  lastMonth: number[];
  spentSoFar: number;
  lastMonthSameDay: number;
  budgetTotal: number;
  budgetSpent: number;
}

const cumulative = (
  expenses: Transaction[],
  days: number,
  upTo: number,
): number[] => {
  const perDay = new Array<number>(days).fill(0);
  for (const t of expenses) {
    const d = getDate(parseISO(t.occurredAt));
    if (d <= upTo) perDay[d - 1] = (perDay[d - 1] ?? 0) + t.amount;
  }
  const out: number[] = [];
  let run = 0;
  for (let i = 0; i < upTo; i += 1) {
    run += perDay[i] ?? 0;
    out.push(Math.round(run * 100) / 100);
  }
  return out;
};

export const computeSpendPace = (
  transactions: Transaction[],
  budgets: Partial<Record<CategoryId, number>>,
  today: Date = new Date(),
): SpendPace => {
  const thisKey = monthKey(today);
  const prevDate = subMonths(today, 1);
  const prevKey = monthKey(prevDate);
  const thisExpenses: Transaction[] = [];
  const prevExpenses: Transaction[] = [];
  for (const t of transactions) {
    if (t.type !== "expense") continue;
    const key = monthKey(t.occurredAt);
    if (key === thisKey) thisExpenses.push(t);
    else if (key === prevKey) prevExpenses.push(t);
  }

  const day = getDate(today);
  const prevDays = getDaysInMonth(prevDate);
  const thisMonth = cumulative(thisExpenses, getDaysInMonth(today), day);
  const lastMonth = cumulative(prevExpenses, prevDays, prevDays);

  const budgeted = (Object.entries(budgets) as [CategoryId, number][]).filter(
    ([, limit]) => limit > 0,
  );
  const budgetCats = new Set(budgeted.map(([id]) => id));

  return {
    thisMonth,
    lastMonth,
    spentSoFar: thisMonth[thisMonth.length - 1] ?? 0,
    lastMonthSameDay: lastMonth[Math.min(day, prevDays) - 1] ?? 0,
    budgetTotal: budgeted.reduce((acc, [, limit]) => acc + limit, 0),
    budgetSpent: thisExpenses
      .filter((t) => budgetCats.has(t.category))
      .reduce((acc, t) => acc + t.amount, 0),
  };
};
