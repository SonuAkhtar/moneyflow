"use client";

import { Wallet } from "lucide-react";
import { useFinanceStore } from "@/store/financeStore";
import { useFinanceMetrics } from "@/hooks/useFinanceMetrics";
import { formatCurrency, currentMonthKey, monthLabel } from "@/utils";
import styles from "./MonthOverview.module.scss";

export const MonthOverview = () => {
  const currency = useFinanceStore((s) => s.profile?.currency ?? "INR");
  const { monthIncome, monthExpenses, monthSaved, savingsRate } =
    useFinanceMetrics();

  const stats = [
    { key: "earned", label: "Earned", value: monthIncome, tone: "in" as const },
    { key: "spent", label: "Spent", value: monthExpenses, tone: "out" as const },
    { key: "saved", label: "Saving", value: monthSaved, tone: "save" as const },
  ];

  return (
    <div className={styles.card}>
      <span className={styles.sheen} aria-hidden />

      <div className={styles.top}>
        <span className={styles.chip} aria-hidden />
        <span className={styles.brand}>
          <Wallet size={14} />
          moneyFlow
        </span>
        <span className={styles.rate}>{savingsRate}% saved</span>
      </div>

      <span className={styles.month}>{monthLabel(currentMonthKey())}</span>

      <div className={styles.grid}>
        {stats.map((stat) => (
          <div key={stat.key} className={styles.stat}>
            <span className={styles.stat_label}>{stat.label}</span>
            <span
              className={`${styles.stat_value} ${styles[`stat_value--${stat.tone}`]}`}
            >
              {formatCurrency(stat.value, currency)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
