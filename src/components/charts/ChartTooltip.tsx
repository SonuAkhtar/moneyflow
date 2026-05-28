"use client";

import { formatCurrency } from "@/utils";
import styles from "./charts.module.scss";

interface TooltipPayloadEntry {
  name?: string;
  value?: number | string;
  color?: string;
  dataKey?: string | number;
}

interface ChartTooltipProps {
  active?: boolean;
  label?: string | number;
  payload?: TooltipPayloadEntry[];
  currency?: string;
}

export const ChartTooltip = ({
  active,
  label,
  payload,
  currency = "INR",
}: ChartTooltipProps) => {
  if (!active || !payload || payload.length === 0) return null;

  return (
    <div className={styles.tooltip}>
      {label !== undefined && <p className={styles.tooltip_label}>{label}</p>}
      <div className={styles.tooltip_rows}>
        {payload.map((entry, index) => (
          <div key={index} className={styles.tooltip_row}>
            <span
              className={styles.tooltip_dot}
              style={{ background: entry.color }}
            />
            <span className={styles.tooltip_name}>{entry.name}</span>
            <span className={styles.tooltip_value}>
              {typeof entry.value === "number"
                ? formatCurrency(entry.value, currency, { compact: entry.value > 9999 })
                : entry.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
