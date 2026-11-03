"use client";

import { ArrowRight } from "lucide-react";
import { useFinanceStore } from "@/store/financeStore";
import { cn, formatCurrency, monthKey } from "@/utils";
import {
  computeBudgetStatus,
  FIXED_COSTS,
  type BudgetExpense,
} from "@/utils/spendPace";
import styles from "./BudgetImpact.module.scss";

interface BudgetImpactProps {
  draft: BudgetExpense;
  /** The expense being edited, replaced by `draft` in the preview. */
  replaceId?: string;
}

export const BudgetImpact = ({ draft, replaceId }: BudgetImpactProps) => {
  const budget = useFinanceStore((s) => s.spendBudget);
  const transactions = useFinanceStore((s) => s.transactions);
  const currency = useFinanceStore((s) => s.profile?.currency ?? "INR");

  if (
    FIXED_COSTS.includes(draft.category) ||
    monthKey(draft.occurredAt) !== monthKey()
  )
    return null;

  const major = draft.isBigExpense;
  if (!budget || !(major ? budget.major : budget.daily)) return null;

  const pick = (s: ReturnType<typeof computeBudgetStatus>) =>
    major ? s.majorLeft : s.todayLeft;
  const before = pick(computeBudgetStatus(budget, transactions));
  const after = pick(
    computeBudgetStatus(budget, [
      ...transactions.filter((t) => t.id !== replaceId),
      draft,
    ]),
  );
  const label = (left: number) =>
    left < 0
      ? `${formatCurrency(-left, currency)} over`
      : `${formatCurrency(left, currency)} left`;

  return (
    <p className={styles.line} aria-live="polite">
      <span className={styles.line_scope}>
        {major ? "This month" : "Today"}
      </span>
      <span className={cn(before < 0 && styles.over)}>{label(before)}</span>
      {after !== before && (
        <>
          <ArrowRight size={14} aria-label="becomes" />
          <strong className={cn(after < 0 && styles.over)}>
            {label(after)}
          </strong>
        </>
      )}
    </p>
  );
};
