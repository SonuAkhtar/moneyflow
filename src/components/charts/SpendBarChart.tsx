"use client";

import {
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  ReferenceLine,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ChartTooltip } from "./ChartTooltip";
import styles from "./charts.module.scss";

const REDUCED =
  typeof window !== "undefined" &&
  typeof window.matchMedia === "function" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

interface BarDatum {
  label: string;
  value: number;
}

interface SpendBarChartProps {
  data: BarDatum[];
  height?: number;
  currency?: string;
  uniformColor?: string;
  negativeColor?: string;
}

export const SpendBarChart = ({
  data,
  height = 180,
  currency,
  uniformColor,
  negativeColor = "var(--chart-expense)",
}: SpendBarChartProps) => {
  const max = Math.max(...data.map((d) => d.value), 1);
  const hasNegative = data.some((d) => d.value < 0);

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
          <YAxis
            hide
            domain={[
              (min: number) => Math.min(0, min),
              (top: number) => Math.max(0, top),
            ]}
          />
          {hasNegative && <ReferenceLine y={0} stroke="var(--text-tertiary)" />}
          <Tooltip
            content={<ChartTooltip currency={currency} />}
            cursor={{ fill: "var(--surface-input)" }}
          />
          <Bar
            dataKey="value"
            name="Spent"
            radius={[6, 6, 6, 6]}
            isAnimationActive={!REDUCED}
            animationDuration={320}
          >
            {data.map((entry, index) => (
              <Cell
                key={index}
                fill={
                  entry.value < 0
                    ? negativeColor
                    : (uniformColor ??
                      (entry.value >= max * 0.8
                        ? "var(--chart-expense)"
                        : "var(--chart-income)"))
                }
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};
