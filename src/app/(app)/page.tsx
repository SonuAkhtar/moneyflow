"use client";

import { motion } from "framer-motion";
import { CalendarClock, PiggyBank, TrendingUp, Wallet } from "lucide-react";
import { BalanceHero } from "@/sections/BalanceHero/BalanceHero";
import { HealthScore } from "@/sections/HealthScore/HealthScore";
import { InsightTeaser } from "@/sections/InsightTeaser/InsightTeaser";
import { BudgetOverview } from "@/sections/BudgetOverview/BudgetOverview";
import { GoalsRail } from "@/sections/GoalsRail/GoalsRail";
import { RecentTransactions } from "@/sections/RecentTransactions/RecentTransactions";
import { StatCard } from "@/components/StatCard/StatCard";
import { useFinanceMetrics } from "@/hooks/useFinanceMetrics";
import { useFinanceStore } from "@/store/financeStore";
import { staggerContainer, listItem } from "@/themes/animations";
import styles from "./page.module.scss";

export default function HomePage() {
  const metrics = useFinanceMetrics();
  const currency = useFinanceStore((s) => s.profile?.currency ?? "INR");

  return (
    <motion.div
      className={styles.page}
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
    >
      <motion.div variants={listItem}>
        <BalanceHero />
      </motion.div>

      <motion.div className={styles.page_stats} variants={listItem}>
        <StatCard
          label="Saved this month"
          value={metrics.monthSaved}
          currency={currency}
          icon={PiggyBank}
          tone="lime"
          caption={`${metrics.savingsRate}% of income`}
        />
        <StatCard
          label="Carried forward"
          value={metrics.carriedForward}
          currency={currency}
          icon={CalendarClock}
          tone="ocean"
          caption="From last month"
        />
        <StatCard
          label="Daily average"
          value={metrics.dailyAverage}
          currency={currency}
          icon={TrendingUp}
          tone="orange"
          caption="Spend per day"
        />
        <StatCard
          label="Big expenses"
          value={metrics.bigExpenseTotal}
          currency={currency}
          icon={Wallet}
          tone="neutral"
          caption="This month"
        />
      </motion.div>

      <motion.div variants={listItem}>
        <HealthScore />
      </motion.div>

      <motion.div variants={listItem}>
        <InsightTeaser />
      </motion.div>

      <motion.div variants={listItem}>
        <BudgetOverview />
      </motion.div>

      <motion.div variants={listItem}>
        <GoalsRail />
      </motion.div>

      <motion.div variants={listItem}>
        <RecentTransactions />
      </motion.div>
    </motion.div>
  );
}
