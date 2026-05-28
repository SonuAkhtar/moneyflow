"use client";

import { Card } from "@/components/Card/Card";
import { RadialProgress } from "@/components/RadialProgress/RadialProgress";
import { Badge } from "@/components/Badge/Badge";
import { useFinanceMetrics } from "@/hooks/useFinanceMetrics";
import { useFinanceStore } from "@/store/financeStore";
import { formatCurrency, formatPercent } from "@/utils";
import type { HealthBand } from "@/types";
import styles from "./HealthScore.module.scss";

const BAND_COPY: Record<HealthBand, { label: string; tone: "lime" | "ocean" | "orange" | "danger" }> = {
  excellent: { label: "Excellent", tone: "lime" },
  good: { label: "On track", tone: "ocean" },
  fair: { label: "Needs care", tone: "orange" },
  poor: { label: "At risk", tone: "danger" },
};

export const HealthScore = () => {
  const metrics = useFinanceMetrics();
  const currency = useFinanceStore((s) => s.profile?.currency ?? "INR");
  const band = BAND_COPY[metrics.healthBand];

  return (
    <Card surface="solid" className={styles.health}>
      <div className={styles.health_ring}>
        <RadialProgress
          value={metrics.healthScore}
          label={String(metrics.healthScore)}
          caption="/ 100"
        />
      </div>
      <div className={styles.health_info}>
        <div className={styles.health_head}>
          <span className={styles.health_title}>Financial health</span>
          <Badge tone={band.tone} dot>
            {band.label}
          </Badge>
        </div>
        <ul className={styles.health_list}>
          <li>
            <span>Savings rate</span>
            <strong>{formatPercent(metrics.savingsRate)}</strong>
          </li>
          <li>
            <span>EMI burden</span>
            <strong>{formatCurrency(metrics.emiBurden, currency, { compact: true })}</strong>
          </li>
          <li>
            <span>Big expenses</span>
            <strong>{formatCurrency(metrics.bigExpenseTotal, currency, { compact: true })}</strong>
          </li>
        </ul>
      </div>
    </Card>
  );
};
