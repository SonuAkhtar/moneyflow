"use client";

import { useMemo } from "react";
import { Target } from "lucide-react";
import { Card } from "@/components/Card/Card";
import { SectionHeader } from "@/components/SectionHeader/SectionHeader";
import { ProgressBar } from "@/components/ProgressBar/ProgressBar";
import { EmptyState } from "@/components/EmptyState/EmptyState";
import { useFinanceStore } from "@/store/financeStore";
import { getCategoryMeta } from "@/constants/categories";
import { currentMonthKey, budgetUsage, formatCurrency } from "@/utils";
import styles from "./BudgetOverview.module.scss";

export const BudgetOverview = () => {
  const budgets = useFinanceStore((s) => s.budgets);
  const currency = useFinanceStore((s) => s.profile?.currency ?? "INR");

  const monthBudgets = useMemo(() => {
    const month = currentMonthKey();
    return budgets
      .filter((b) => b.month === month)
      .sort((a, b) => budgetUsage(b.spent, b.limit) - budgetUsage(a.spent, a.limit))
      .slice(0, 4);
  }, [budgets]);

  return (
    <section>
      <SectionHeader title="Budgets" caption="This month" />
      {monthBudgets.length === 0 ? (
        <Card surface="solid">
          <EmptyState
            icon={Target}
            title="No budgets set"
            description="Create category budgets to track limits."
          />
        </Card>
      ) : (
        <div className={styles.grid}>
          {monthBudgets.map((budget) => {
            const meta = getCategoryMeta(budget.category);
            const usage = budgetUsage(budget.spent, budget.limit);
            const over = usage >= 100;
            return (
              <Card key={budget.id} surface="solid" className={styles.item}>
                <div className={styles.item_head}>
                  <span
                    className={styles.item_icon}
                    style={{ background: `${meta.color}1f`, color: meta.color }}
                  >
                    <meta.icon size={16} />
                  </span>
                  <span className={styles.item_name}>{meta.label}</span>
                  <span className={styles.item_pct}>{Math.round(usage)}%</span>
                </div>
                <ProgressBar
                  value={usage}
                  tone={over ? "danger" : usage > 80 ? "orange" : "lime"}
                  size="sm"
                />
                <div className={styles.item_foot}>
                  <span>{formatCurrency(budget.spent, currency)}</span>
                  <span className={styles.item_limit}>
                    / {formatCurrency(budget.limit, currency)}
                  </span>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </section>
  );
};
