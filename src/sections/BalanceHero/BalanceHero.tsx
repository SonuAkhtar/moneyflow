"use client";

import { useState } from "react";
import { ArrowDownLeft, ArrowUpRight, Eye, EyeOff } from "lucide-react";
import { Card } from "@/components/Card/Card";
import { AnimatedNumber } from "@/components/AnimatedNumber/AnimatedNumber";
import { ProgressBar } from "@/components/ProgressBar/ProgressBar";
import { useFinanceMetrics } from "@/hooks/useFinanceMetrics";
import { useFinanceStore } from "@/store/financeStore";
import { formatCurrency, goalProgress } from "@/utils";
import styles from "./BalanceHero.module.scss";

export const BalanceHero = () => {
  const metrics = useFinanceMetrics();
  const profile = useFinanceStore((s) => s.profile);
  const currency = profile?.currency ?? "INR";
  const [hidden, setHidden] = useState(false);
  const targetPct = goalProgress(metrics.monthSaved, profile?.savingsTarget ?? 0);

  return (
    <Card surface="gradient" glow="lime" className={styles.hero}>
      <div className={styles.hero_top}>
        <span className={styles.hero_label}>Total balance</span>
        <button
          className={styles.hero_eye}
          onClick={() => setHidden((v) => !v)}
          aria-label={hidden ? "Show balance" : "Hide balance"}
        >
          {hidden ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>

      {hidden ? (
        <span className={styles.hero_balance}>••••••</span>
      ) : (
        <AnimatedNumber
          className={styles.hero_balance}
          value={metrics.totalBalance}
          currency={currency}
        />
      )}

      <div className={styles.hero_savings}>
        <div className={styles.hero_savingsRow}>
          <span>Savings target</span>
          <span>{Math.round(targetPct)}%</span>
        </div>
        <ProgressBar value={targetPct} tone="lime" size="sm" />
      </div>

      <div className={styles.hero_pills}>
        <div className={styles.hero_pill}>
          <span className={`${styles.hero_pillIcon} ${styles["hero_pillIcon--in"]}`}>
            <ArrowDownLeft size={16} />
          </span>
          <span className={styles.hero_pillText}>
            <span className={styles.hero_pillLabel}>Income</span>
            <span className={styles.hero_pillValue}>
              {formatCurrency(metrics.monthIncome, currency, { compact: true })}
            </span>
          </span>
        </div>
        <div className={styles.hero_pill}>
          <span className={`${styles.hero_pillIcon} ${styles["hero_pillIcon--out"]}`}>
            <ArrowUpRight size={16} />
          </span>
          <span className={styles.hero_pillText}>
            <span className={styles.hero_pillLabel}>Spent</span>
            <span className={styles.hero_pillValue}>
              {formatCurrency(metrics.monthExpenses, currency, { compact: true })}
            </span>
          </span>
        </div>
      </div>
    </Card>
  );
};
