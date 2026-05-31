"use client";

import { motion } from "framer-motion";
import { CreditCard, CheckCircle2, Hourglass, Wallet } from "lucide-react";
import { Card } from "@/components/Card/Card";
import { ProgressBar } from "@/components/ProgressBar/ProgressBar";
import { EmiList } from "@/sections/EmiList/EmiList";
import { BorrowingsList } from "@/sections/BorrowingsList/BorrowingsList";
import { useFinanceStore } from "@/store/financeStore";
import { useFinanceMetrics } from "@/hooks/useFinanceMetrics";
import { emiKind, emiPaidAmount, emiPaidMonths, formatCurrency, sumBy } from "@/utils";
import { staggerContainer, listItem } from "@/themes/animations";
import styles from "./page.module.scss";

export default function EmiPage() {
  const emis = useFinanceStore((s) => s.emis);
  const currency = useFinanceStore((s) => s.profile?.currency ?? "INR");
  const { monthIncome } = useFinanceMetrics();

  const loans = emis.filter((e) => e.status === "active" && emiKind(e) === "loan");
  const loanMonthly = sumBy(loans, (e) => e.monthlyAmount);
  const burdenShare =
    monthIncome > 0 ? Math.round((loanMonthly / monthIncome) * 100) : 0;
  const paidSoFar = sumBy(loans, emiPaidAmount);

  const scheduled = loans.filter((e) => e.totalMonths > 0);
  const loanTotal = sumBy(scheduled, (e) => e.totalMonths * e.monthlyAmount);
  const loanPaid = sumBy(
    scheduled,
    (e) => Math.min(emiPaidMonths(e), e.totalMonths) * e.monthlyAmount,
  );
  const loanRemaining = Math.max(0, loanTotal - loanPaid);
  const repaidPct = loanTotal > 0 ? (loanPaid / loanTotal) * 100 : 0;

  const stats = [
    {
      key: "monthly",
      icon: Wallet,
      value: formatCurrency(loanMonthly, currency, { compact: true }),
      label: "Per month",
    },
    {
      key: "paid",
      icon: CheckCircle2,
      value: formatCurrency(paidSoFar, currency, { compact: true }),
      label: "Paid so far",
    },
    {
      key: "remaining",
      icon: Hourglass,
      value: formatCurrency(loanRemaining, currency, { compact: true }),
      label: "Loan left",
    },
  ];

  return (
    <motion.div
      className={styles.page}
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
    >
      <motion.div variants={listItem}>
        <div className={styles.hero}>
          <span className={styles.hero_glow} aria-hidden />
          <div className={styles.hero_top}>
            <span className={styles.hero_badge}>
              <CreditCard size={16} />
              Monthly total
            </span>
            <span className={styles.hero_share}>{burdenShare}% of income</span>
          </div>
          <span className={styles.hero_value}>
            {formatCurrency(loanMonthly, currency)}
          </span>
          <span className={styles.hero_meta}>
            across {loans.length} active EMI{loans.length === 1 ? "" : "s"}
          </span>
          {loanTotal > 0 && (
            <div className={styles.hero_progress}>
              <ProgressBar value={repaidPct} tone="ocean" size="sm" />
              <span className={styles.hero_meta}>
                {Math.round(repaidPct)}% of loans repaid ·{" "}
                {formatCurrency(loanRemaining, currency)} left
              </span>
            </div>
          )}
        </div>
      </motion.div>

      <motion.div className={styles.stats} variants={listItem}>
        {stats.map((stat) => (
          <Card
            key={stat.key}
            surface="solid"
            padded={false}
            className={styles.stat}
          >
            <span className={styles.stat_icon}>
              <stat.icon size={15} />
            </span>
            <span className={styles.stat_value}>{stat.value}</span>
            <span className={styles.stat_label}>{stat.label}</span>
          </Card>
        ))}
      </motion.div>

      <motion.div variants={listItem}>
        <EmiList kind="loan" />
      </motion.div>

      <motion.div variants={listItem}>
        <BorrowingsList />
      </motion.div>
    </motion.div>
  );
}
