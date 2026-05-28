"use client";

import {
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
} from "recharts";
import { ChartTooltip } from "./ChartTooltip";
import styles from "./charts.module.scss";

interface BarDatum {
  label: string;
  value: number;
}

interface SpendBarChartProps {
  data: BarDatum[];
  height?: number;
  currency?: string;
}

export const SpendBarChart = ({ data, height = 180, currency }: SpendBarChartProps) => {
  const max = Math.max(...data.map((d) => d.value), 1);

  return (
    <div className={styles.chart} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 0, bottom: 0, left: 0 }}>
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={false}
            tick={{ fill: "var(--text-tertiary)", fontSize: 10 }}
            interval="preserveStartEnd"
          />
          <Tooltip
            content={<ChartTooltip currency={currency} />}
            cursor={{ fill: "var(--surface-input)" }}
          />
          <Bar dataKey="value" name="Spent" radius={[6, 6, 6, 6]} animationDuration={800}>
            {data.map((entry, index) => (
              <Cell
                key={index}
                fill={entry.value >= max * 0.8 ? "#ff7a1a" : "#c6f432"}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};
