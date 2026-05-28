"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { ChartTooltip } from "./ChartTooltip";
import { formatCurrency } from "@/utils";
import styles from "./charts.module.scss";

interface DonutDatum {
  label: string;
  value: number;
  color: string;
}

interface CategoryDonutProps {
  data: DonutDatum[];
  total: number;
  currency?: string;
  height?: number;
}

export const CategoryDonut = ({
  data,
  total,
  currency = "INR",
  height = 220,
}: CategoryDonutProps) => (
  <div className={styles.donut} style={{ height }}>
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Tooltip content={<ChartTooltip currency={currency} />} />
        <Pie
          data={data}
          dataKey="value"
          nameKey="label"
          innerRadius="64%"
          outerRadius="92%"
          paddingAngle={3}
          stroke="none"
          animationDuration={900}
        >
          {data.map((entry) => (
            <Cell key={entry.label} fill={entry.color} />
          ))}
        </Pie>
      </PieChart>
    </ResponsiveContainer>
    <div className={styles.donut_center}>
      <span className={styles.donut_total}>
        {formatCurrency(total, currency, { compact: total > 9999 })}
      </span>
      <span className={styles.donut_caption}>this month</span>
    </div>
  </div>
);
