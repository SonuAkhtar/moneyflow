"use client";

import { Wallet } from "lucide-react";
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
  const fmt = (n: number) => formatCurrency(n, currency);
  const over = after < 0;
  const ratio = before > 0 ? Math.max(0, Math.min(1, after / before)) : 0;

  return (
    <div
      className={cn(
        styles.card,
        over ? styles["card--over"] : ratio < 0.25 && styles["card--low"],
      )}
      aria-live="polite"
    >
      <span className={styles.card_icon} aria-hidden>
        <Wallet size={18} />
      </span>
      <span className={styles.card_text}>
        <span className={styles.card_label}>
          {major ? "Safe to spend this month" : "Safe to spend today"}
        </span>
        <strong className={styles.card_value}>
          {over ? `${fmt(-after)} over budget` : fmt(after)}
        </strong>
        {after !== before && (
          <span className={styles.card_note}>
            {before < 0
              ? `Already ${fmt(-before)} over`
              : `${fmt(before)} before this`}
          </span>
        )}
      </span>
      <span className={styles.card_meter} aria-hidden>
        <span style={{ width: `${ratio * 100}%` }} />
      </span>
    </div>
  );
};
