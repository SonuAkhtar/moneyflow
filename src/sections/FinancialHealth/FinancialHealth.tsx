"use client";

import { useMemo } from "react";
import { m } from "framer-motion";
import { Card } from "@/components/Card/Card";
import { useFinanceStore } from "@/store/financeStore";
import { useFinanceMetrics } from "@/hooks/useFinanceMetrics";
import { formatCurrency } from "@/utils";
import type { FinanceMetrics } from "@/hooks/useFinanceMetrics";
import type { HealthBand } from "@/types";
import styles from "./FinancialHealth.module.scss";

const BAND: Record<HealthBand, { label: string; color: string }> = {
  excellent: { label: "Excellent", color: "var(--color-success)" },
  good: { label: "Good", color: "var(--color-lime)" },
  fair: { label: "Fair", color: "var(--color-warning)" },
  poor: { label: "Needs work", color: "var(--color-danger)" },
};

const insightFor = (m: FinanceMetrics): string => {
  if (m.monthIncome > 0 && m.emiBurden > m.monthIncome * 0.4)
    return "EMIs eat a big slice of your income - go easy on new debt.";
  if (m.savingsRate >= 30)
    return "Strong saving rate this month - keep the momentum going.";
  if (m.monthSaved <= 0 && m.monthExpenses > 0)
    return "You spent more than you earned this month - trim where you can.";
  if (m.healthBand === "excellent")
    return "Savings are healthy and debt is light. Nicely balanced.";
  return "A steady month - saving a little more would lift your score.";
};

const R = 52;
const C = 2 * Math.PI * R;

export const FinancialHealth = () => {
  const metrics = useFinanceMetrics();
  const currency = useFinanceStore((s) => s.profile?.currency ?? "INR");
  const target = useFinanceStore((s) => s.profile?.savingsTarget ?? 0);

  const band = BAND[metrics.healthBand];
  const insight = useMemo(() => insightFor(metrics), [metrics]);
  const offset =
    C * (1 - Math.max(0, Math.min(100, metrics.healthScore)) / 100);
  const targetPct =
    target > 0
      ? Math.min(100, Math.round((metrics.monthSaved / target) * 100))
      : 0;

  return (
    <Card surface="solid" className={styles.health}>
      <div className={styles.head}>
        <span className={styles.head_title}>Financial health</span>
        <span className={styles.head_band} style={{ color: band.color }}>
          {band.label}
        </span>
      </div>

      <div className={styles.body}>
        <div className={styles.ring}>
          <svg viewBox="0 0 120 120" className={styles.ring_svg} aria-hidden>
            <circle className={styles.ring_track} cx="60" cy="60" r={R} />
            <m.circle
              className={styles.ring_fill}
              cx="60"
              cy="60"
              r={R}
              style={{ stroke: band.color }}
              strokeDasharray={C}
              strokeLinecap="round"
              transform="rotate(-90 60 60)"
              initial={{ strokeDashoffset: C }}
              animate={{ strokeDashoffset: offset }}
              transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
            />
          </svg>
          <div className={styles.ring_center}>
            <span className={styles.ring_score}>{metrics.healthScore}</span>
            <span className={styles.ring_max}>/ 100</span>
          </div>
        </div>

        <div className={styles.detail}>
          <p className={styles.detail_insight}>{insight}</p>
          <div className={styles.detail_stats}>
            <div className={styles.stat}>
              <span className={styles.stat_label}>Net position</span>
              <span className={styles.stat_value}>
                {formatCurrency(metrics.totalBalance, currency, {
                  compact: true,
                })}
              </span>
            </div>
            <div className={styles.stat}>
              <span className={styles.stat_label}>
                {target > 0 ? "Saved vs target" : "Saved this month"}
              </span>
              <span className={styles.stat_value}>
                {target > 0
                  ? `${targetPct}%`
                  : formatCurrency(metrics.monthSaved, currency, {
                      compact: true,
                    })}
              </span>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};
