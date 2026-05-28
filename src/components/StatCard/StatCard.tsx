"use client";

import { ArrowDownRight, ArrowUpRight, type LucideIcon } from "lucide-react";
import { Card } from "@/components/Card/Card";
import { AnimatedNumber } from "@/components/AnimatedNumber/AnimatedNumber";
import { cn } from "@/utils";
import styles from "./StatCard.module.scss";

interface StatCardProps {
  label: string;
  value: number;
  currency?: string;
  format?: "currency" | "number" | "raw";
  icon?: LucideIcon;
  tone?: "lime" | "orange" | "ocean" | "neutral";
  delta?: { value: number; direction: "up" | "down" | "flat" };
  caption?: string;
}

export const StatCard = ({
  label,
  value,
  currency,
  format = "currency",
  icon: Icon,
  tone = "neutral",
  delta,
  caption,
}: StatCardProps) => (
  <Card surface="glass" className={cn(styles.stat, styles[`stat--${tone}`])}>
    <div className={styles.stat_head}>
      <span className={styles.stat_label}>{label}</span>
      {Icon && (
        <span className={styles.stat_iconWrap}>
          <Icon size={16} />
        </span>
      )}
    </div>
    <AnimatedNumber
      className={styles.stat_value}
      value={value}
      currency={currency}
      format={format}
    />
    {(delta || caption) && (
      <div className={styles.stat_foot}>
        {delta && delta.direction !== "flat" && (
          <span
            className={cn(
              styles.stat_delta,
              delta.direction === "up"
                ? styles["stat_delta--up"]
                : styles["stat_delta--down"],
            )}
          >
            {delta.direction === "up" ? (
              <ArrowUpRight size={13} />
            ) : (
              <ArrowDownRight size={13} />
            )}
            {delta.value}%
          </span>
        )}
        {caption && <span className={styles.stat_caption}>{caption}</span>}
      </div>
    )}
  </Card>
);
