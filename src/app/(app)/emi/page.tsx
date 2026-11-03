"use client";

import { m } from "framer-motion";
import { CreditCard } from "lucide-react";
import { ProgressBar } from "@/components/ProgressBar/ProgressBar";
import { EmiList } from "@/sections/EmiList/EmiList";
import { BorrowingsList } from "@/sections/BorrowingsList/BorrowingsList";
import { useFinanceStore } from "@/store/financeStore";
import { useFinanceMetrics } from "@/hooks/useFinanceMetrics";
import {
  currentMonthKey,
  emiAmountFor,
  emiKind,
  emiPaidAmount,
  emiScheduledAmount,
  formatCurrency,
  sumBy,
} from "@/utils";
import { staggerContainer, listItem } from "@/themes/animations";
import styles from "./page.module.scss";

export default function EmiPage() {
  const emis = useFinanceStore((s) => s.emis);
  const currency = useFinanceStore((s) => s.profile?.currency ?? "INR");
  const { monthIncome } = useFinanceMetrics();

  const loans = emis.filter(
    (e) => e.status === "active" && emiKind(e) === "loan",
  );
  const thisMonth = currentMonthKey();
  const loanMonthly = sumBy(loans, (e) => emiAmountFor(e, thisMonth));
  const burdenShare =
    monthIncome > 0 ? Math.round((loanMonthly / monthIncome) * 100) : 0;
  const paidSoFar = sumBy(loans, emiPaidAmount);

  const scheduled = loans.filter((e) => e.totalMonths > 0);
  const loanTotal = sumBy(scheduled, (e) =>
    emiScheduledAmount(e, e.totalMonths),
  );
  const loanPaid = sumBy(scheduled, emiPaidAmount);
  const loanRemaining = Math.max(0, loanTotal - loanPaid);
  const repaidPct = loanTotal > 0 ? (loanPaid / loanTotal) * 100 : 0;

  const stats = [
    { key: "paid", label: "Paid so far", value: paidSoFar },
    { key: "left", label: "Loan left", value: loanRemaining },
  ];

  return (
    <m.div
      className={styles.page}
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
    >
      <m.div variants={listItem}>
        <section className={styles.hero} aria-label="Monthly total">
          <div className={styles.hero_top}>
            <span className={styles.hero_badge}>
              <CreditCard size={14} aria-hidden />
              Monthly total
            </span>
            {monthIncome > 0 && (
              <span className={styles.hero_share}>
                {burdenShare}% of income
              </span>
            )}
          </div>
          <div className={styles.hero_main}>
            <span className={styles.hero_value}>
              {formatCurrency(loanMonthly, currency)}
            </span>
            <span className={styles.hero_meta}>
              /mo · {loans.length} active EMI{loans.length === 1 ? "" : "s"}
            </span>
          </div>
          {loanTotal > 0 && (
            <ProgressBar
              value={repaidPct}
              tone="ocean"
              size="sm"
              label={`${Math.round(repaidPct)}% of loans repaid`}
            />
          )}
          <div className={styles.hero_stats}>
            {stats.map((stat) => (
              <div key={stat.key} className={styles.hero_stat}>
                <span className={styles.hero_statValue}>
                  {formatCurrency(stat.value, currency, {
                    compact: stat.value >= 100000,
                  })}
                </span>
                <span className={styles.hero_statLabel}>{stat.label}</span>
              </div>
            ))}
            <div className={styles.hero_stat}>
              <span className={styles.hero_statValue}>
                {`${Math.round(repaidPct)}%`}
              </span>
              <span className={styles.hero_statLabel}>Repaid</span>
            </div>
          </div>
        </section>
      </m.div>

      <m.div variants={listItem}>
        <EmiList kind="loan" />
      </m.div>

      <m.div variants={listItem}>
        <BorrowingsList />
      </m.div>
    </m.div>
  );
}
