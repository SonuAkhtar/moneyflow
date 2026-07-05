"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, SlidersHorizontal } from "lucide-react";
import { Card } from "@/components/Card/Card";
import { SectionHeader } from "@/components/SectionHeader/SectionHeader";
import { Button } from "@/components/Button/Button";
import { BudgetSheet } from "@/sections/BudgetSheet/BudgetSheet";
import { useFinanceStore } from "@/store/financeStore";
import { getCategoryMeta } from "@/constants/categories";
import { cn, formatCurrency } from "@/utils";
import type { CategoryId } from "@/types";
import styles from "./CategoryBudgets.module.scss";

interface CategoryBudgetsProps {
  spentByCategory: Record<string, number>;
  currency: string;
}

export const CategoryBudgets = ({
  spentByCategory,
  currency,
}: CategoryBudgetsProps) => {
  const budgets = useFinanceStore((s) => s.budgets);
  const [open, setOpen] = useState(false);

  const rows = useMemo(
    () =>
      (Object.entries(budgets) as [CategoryId, number][])
        .filter(([, limit]) => limit > 0)
        .map(([id, limit]) => {
          const spent = spentByCategory[id] ?? 0;
          return {
            id,
            limit,
            spent,
            pct: Math.min(100, (spent / limit) * 100),
            over: spent > limit,
            meta: getCategoryMeta(id),
          };
        })
        .sort((a, b) => b.pct - a.pct),
    [budgets, spentByCategory],
  );

  const overCount = rows.filter((r) => r.over).length;

  return (
    <section>
      <SectionHeader
        title="Budgets"
        caption={
          overCount > 0 ? `${overCount} over budget` : "Monthly category limits"
        }
      />
      <Card surface="solid" className={styles.card}>
        {rows.length === 0 ? (
          <p className={styles.empty}>
            Set monthly limits to keep category spending in check.
          </p>
        ) : (
          <div className={styles.list}>
            {rows.map((row) => {
              const Icon = row.meta.icon;
              return (
                <div key={row.id} className={styles.row}>
                  <div className={styles.row_head}>
                    <span className={styles.row_name}>
                      <span
                        className={styles.row_icon}
                        style={{ color: row.meta.color }}
                      >
                        <Icon size={15} />
                      </span>
                      {row.meta.label}
                      {row.over && (
                        <AlertTriangle
                          size={13}
                          className={styles.row_alert}
                          aria-label="Over budget"
                        />
                      )}
                    </span>
                    <span
                      className={cn(
                        styles.row_amt,
                        row.over && styles["row_amt--over"],
                      )}
                    >
                      {formatCurrency(row.spent, currency)} /{" "}
                      {formatCurrency(row.limit, currency)}
                    </span>
                  </div>
                  <span className={styles.track}>
                    <span
                      className={cn(
                        styles.fill,
                        row.over && styles["fill--over"],
                      )}
                      style={{ width: `${row.pct}%` }}
                    />
                  </span>
                </div>
              );
            })}
          </div>
        )}
        <Button
          variant="secondary"
          size="sm"
          icon={SlidersHorizontal}
          onClick={() => setOpen(true)}
          className={styles.manage}
        >
          {rows.length === 0 ? "Set budgets" : "Manage budgets"}
        </Button>
      </Card>

      <BudgetSheet open={open} onClose={() => setOpen(false)} />
    </section>
  );
};
