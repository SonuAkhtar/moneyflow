"use client";

import { useFinanceStore } from "@/store/financeStore";
import { useFinanceMetrics } from "@/hooks/useFinanceMetrics";
import { useUiStore } from "@/store/uiStore";
import { formatAmount, currentMonthKey, monthLabel } from "@/utils";
import styles from "./MonthOverview.module.scss";

export const MonthOverview = () => {
  const currency = useFinanceStore((s) => s.profile?.currency ?? "INR");
  const hidden = useUiStore((s) => s.amountsHidden);
  const { monthIncome, monthExpenses, monthSaved, savingsRate } =
    useFinanceMetrics();

  const stats = [
    { key: "earned", label: "Earned", value: monthIncome, tone: "in" as const },
    {
      key: "spent",
      label: "Spent",
      value: monthExpenses,
      tone: "out" as const,
    },
    { key: "saved", label: "Saving", value: monthSaved, tone: "save" as const },
  ];

  return (
    <section className={styles.card} aria-label="Monthly statement">
      <div className={styles.top}>
        <h2 className={styles.month}>{monthLabel(currentMonthKey())}</h2>
        <span className={styles.rate}>{savingsRate}% saved</span>
      </div>

      <div className={styles.grid}>
        {stats.map((stat) => (
          <div key={stat.key} className={styles.stat}>
            <span className={styles.stat_label}>{stat.label}</span>
            <span
              className={`${styles.stat_value} ${styles[`stat_value--${stat.tone}`]}`}
              title={formatAmount(stat.value, currency, hidden)}
            >
              {formatAmount(stat.value, currency, hidden)}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
};
