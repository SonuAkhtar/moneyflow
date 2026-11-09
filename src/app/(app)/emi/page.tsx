"use client";

import { m } from "framer-motion";
import { CreditCard } from "lucide-react";
import { RollingNumber } from "@/components/RollingNumber/RollingNumber";
import { EmiList } from "@/sections/EmiList/EmiList";
import { BorrowingsList } from "@/sections/BorrowingsList/BorrowingsList";
import { useFinanceStore } from "@/store/financeStore";
import { useFinanceMetrics } from "@/hooks/useFinanceMetrics";
import {
  currentMonthKey,
  emiAmountFor,
  emiCanLogMonth,
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
  const loanMonthly = sumBy(
    loans.filter((e) => emiCanLogMonth(e, thisMonth)),
    (e) => emiAmountFor(e, thisMonth),
  );
  const burdenShare =
    monthIncome > 0 ? Math.round((loanMonthly / monthIncome) * 100) : 0;
  const paidSoFar = sumBy(loans, emiPaidAmount);

  const scheduled = loans.filter((e) => e.totalMonths > 0);
  const loanTotal = sumBy(scheduled, (e) =>
    emiScheduledAmount(e, e.totalMonths),
  );
  const loanPaid = sumBy(scheduled, emiPaidAmount);
  const loanRemaining = Math.max(0, loanTotal - loanPaid);
  const repaidPct =
    loanTotal > 0 ? Math.min(100, (loanPaid / loanTotal) * 100) : 0;

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

          <div className={styles.hero_body}>
            <div className={styles.hero_main}>
              <RollingNumber
                className={styles.hero_value}
                value={formatCurrency(loanMonthly, currency)}
              />
              <span className={styles.hero_meta}>
                per month · {loans.length} active EMI
                {loans.length === 1 ? "" : "s"}
              </span>
            </div>
            {loanTotal > 0 && (
              <div
                className={styles.ring}
                role="img"
                aria-label={`${Math.round(repaidPct)}% of loans repaid`}
              >
                <svg viewBox="0 0 64 64" aria-hidden>
                  <circle
                    className={styles.ring_track}
                    cx="32"
                    cy="32"
                    r="27"
                  />
                  <m.circle
                    className={styles.ring_fill}
                    cx="32"
                    cy="32"
                    r="27"
                    pathLength={100}
                    initial={{ strokeDashoffset: 100 }}
                    animate={{ strokeDashoffset: 100 - repaidPct }}
                    transition={{ duration: 1.4, ease: [0.16, 1, 0.3, 1] }}
                  />
                </svg>
                <span className={styles.ring_text} aria-hidden>
                  <RollingNumber value={`${Math.round(repaidPct)}%`} />
                  <span className={styles.ring_label}>repaid</span>
                </span>
              </div>
            )}
          </div>

          <div className={styles.hero_stats}>
            {stats.map((stat) => (
              <div key={stat.key} className={styles.hero_stat}>
                <span className={styles.hero_statLabel}>{stat.label}</span>
                <RollingNumber
                  className={styles.hero_statValue}
                  value={formatCurrency(stat.value, currency, {
                    compact: stat.value >= 100000,
                  })}
                />
              </div>
            ))}
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
