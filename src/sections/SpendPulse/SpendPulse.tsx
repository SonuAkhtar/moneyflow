"use client";

import { useId, useMemo, useState } from "react";
import { AnimatePresence, m } from "framer-motion";
import Link from "next/link";
import {
  ArrowDownRight,
  ArrowUpRight,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { Card } from "@/components/Card/Card";
import { ProgressBar } from "@/components/ProgressBar/ProgressBar";
import { BudgetSheet } from "@/sections/BudgetSheet/BudgetSheet";
import { useFinanceStore } from "@/store/financeStore";
import { useFinanceMetrics } from "@/hooks/useFinanceMetrics";
import { cn, formatCurrency } from "@/utils";
import { computeSpendPace } from "@/utils/spendPace";
import { ROUTES } from "@/constants";
import type { HealthBand } from "@/types";
import styles from "./SpendPulse.module.scss";

const BAND_LABEL: Record<HealthBand, string> = {
  excellent: "Excellent",
  good: "Good",
  fair: "Fair",
  poor: "Needs work",
};

const W = 300;
const H = 64;

const toPath = (series: number[], days: number, max: number) =>
  series
    .map((v, i) => {
      const x = days <= 1 ? 0 : (i / (days - 1)) * W;
      const y = H - 4 - (max > 0 ? (v / max) * (H - 8) : 0);
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

export const SpendPulse = () => {
  const transactions = useFinanceStore((s) => s.transactions);
  const budgets = useFinanceStore((s) => s.budgets);
  const currency = useFinanceStore((s) => s.profile?.currency ?? "INR");
  const { healthScore, healthBand } = useFinanceMetrics();
  const [budgetOpen, setBudgetOpen] = useState(false);
  const [open, setOpen] = useState(false);
  const bodyId = useId();

  const pace = useMemo(
    () => computeSpendPace(transactions, budgets),
    [transactions, budgets],
  );
  const fmt = (n: number) => formatCurrency(n, currency);

  const days = Math.max(pace.lastMonth.length, 28);
  const max = Math.max(
    pace.lastMonth[pace.lastMonth.length - 1] ?? 0,
    pace.spentSoFar,
  );
  const diff = pace.spentSoFar - pace.lastMonthSameDay;
  const hasHistory = (pace.lastMonth[pace.lastMonth.length - 1] ?? 0) > 0;
  const budgetPct =
    pace.budgetTotal > 0 ? (pace.budgetSpent / pace.budgetTotal) * 100 : 0;
  const overBudget = pace.budgetSpent > pace.budgetTotal;

  const chartLabel = `Spent ${fmt(pace.spentSoFar)} so far this month, compared with ${fmt(
    pace.lastMonthSameDay,
  )} by the same day last month.`;

  return (
    <Card surface="solid" padded={false} className={styles.card}>
      <h2 className={styles.title}>
        <button
          type="button"
          className={styles.toggle}
          aria-expanded={open}
          aria-controls={bodyId}
          onClick={() => setOpen((v) => !v)}
        >
          <span>Spending pace</span>
          <m.span
            className={styles.chevron}
            animate={{ rotate: open ? 180 : 0 }}
            transition={{ duration: 0.2 }}
            aria-hidden
          >
            <ChevronDown size={20} />
          </m.span>
        </button>
      </h2>

      <AnimatePresence initial={false}>
        {open && (
          <m.div
            id={bodyId}
            className={styles.bodyWrap}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className={styles.body}>
              {hasHistory && diff !== 0 && (
                <span
                  className={cn(
                    styles.delta,
                    diff < 0 ? styles["delta--good"] : styles["delta--bad"],
                  )}
                >
                  {diff < 0 ? (
                    <ArrowDownRight size={14} aria-hidden />
                  ) : (
                    <ArrowUpRight size={14} aria-hidden />
                  )}
                  {fmt(Math.abs(diff))} {diff < 0 ? "less" : "more"} than last
                  month
                </span>
              )}

              <svg
                className={styles.chart}
                viewBox={`0 0 ${W} ${H}`}
                preserveAspectRatio="none"
                role="img"
                aria-label={chartLabel}
              >
                <path
                  d={toPath(pace.lastMonth, days, max)}
                  className={styles.chart_prev}
                />
                <path
                  d={toPath(pace.thisMonth, days, max)}
                  className={styles.chart_now}
                />
              </svg>
              <div className={styles.legend} aria-hidden>
                <span className={styles.legend_now}>This month</span>
                <span className={styles.legend_prev}>Last month</span>
              </div>

              <div className={styles.rows}>
                {pace.budgetTotal > 0 ? (
                  <button
                    type="button"
                    className={styles.row}
                    onClick={() => setBudgetOpen(true)}
                  >
                    <span className={styles.row_text}>
                      <span className={styles.row_label}>Monthly budget</span>
                      <span
                        className={cn(
                          styles.row_value,
                          overBudget && styles["row_value--bad"],
                        )}
                      >
                        {fmt(pace.budgetSpent)} of {fmt(pace.budgetTotal)}
                      </span>
                    </span>
                    <ProgressBar
                      value={budgetPct}
                      size="sm"
                      tone={
                        overBudget
                          ? "danger"
                          : budgetPct >= 80
                            ? "orange"
                            : "lime"
                      }
                      label={`Budget used: ${Math.round(budgetPct)}%`}
                    />
                  </button>
                ) : (
                  <button
                    type="button"
                    className={styles.row}
                    onClick={() => setBudgetOpen(true)}
                  >
                    <span className={styles.row_text}>
                      <span className={styles.row_label}>Monthly budget</span>
                      <span className={styles.row_link}>
                        Set budgets <ChevronRight size={14} aria-hidden />
                      </span>
                    </span>
                  </button>
                )}

                <Link href={ROUTES.profile} className={styles.row}>
                  <span className={styles.row_text}>
                    <span className={styles.row_label}>Financial health</span>
                    <span className={styles.row_value}>
                      {healthScore}/100 · {BAND_LABEL[healthBand]}
                      <ChevronRight size={14} aria-hidden />
                    </span>
                  </span>
                </Link>
              </div>
            </div>
          </m.div>
        )}
      </AnimatePresence>

      <BudgetSheet open={budgetOpen} onClose={() => setBudgetOpen(false)} />
    </Card>
  );
};
