"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ChartTooltip } from "./ChartTooltip";
import { formatCompact } from "@/utils";
import styles from "./charts.module.scss";

const REDUCED =
  typeof window !== "undefined" &&
  typeof window.matchMedia === "function" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

interface TrendDatum {
  label: string;
  income: number;
  expenses: number;
}

interface AreaTrendChartProps {
  data: TrendDatum[];
  height?: number;
  currency?: string;
}

interface DotRenderProps {
  cx?: number;
  cy?: number;
  index?: number;
}

// Render a marker only on the latest point so the current value stands out.
const lastDot = (color: string, lastIndex: number) => {
  const Dot = ({ cx, cy, index }: DotRenderProps) => {
    if (index !== lastIndex || cx == null || cy == null) return <g />;
    return (
      <circle
        cx={cx}
        cy={cy}
        r={4}
        fill={color}
        stroke="var(--surface-card-solid)"
        strokeWidth={2}
      />
    );
  };
  return Dot;
};

export const AreaTrendChart = ({
  data,
  height = 220,
  currency,
}: AreaTrendChartProps) => (
  <div className={styles.chart} style={{ height }}>
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: -18 }}>
        <defs>
          <linearGradient id="grad-income" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--chart-income)" stopOpacity={0.5} />
            <stop offset="100%" stopColor="var(--chart-income)" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="grad-expense" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--chart-expense)" stopOpacity={0.45} />
            <stop offset="100%" stopColor="var(--chart-expense)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid
          strokeDasharray="4 6"
          stroke="var(--border-subtle)"
          vertical={false}
        />
        <XAxis
          dataKey="label"
          tickLine={false}
          axisLine={false}
          tick={{ fill: "var(--text-tertiary)", fontSize: 11 }}
          dy={8}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          width={48}
          tick={{ fill: "var(--text-tertiary)", fontSize: 11 }}
          tickFormatter={(value: number) => formatCompact(value)}
        />
        <Tooltip
          content={<ChartTooltip currency={currency} />}
          cursor={{ stroke: "var(--border-strong)" }}
        />
        <Area
          type="monotone"
          dataKey="income"
          name="Income"
          stroke="var(--chart-income)"
          strokeWidth={2.5}
          fill="url(#grad-income)"
          isAnimationActive={!REDUCED}
          animationDuration={320}
          dot={lastDot("var(--chart-income)", data.length - 1)}
          activeDot={{ r: 4 }}
        />
        <Area
          type="monotone"
          dataKey="expenses"
          name="Expenses"
          stroke="var(--chart-expense)"
          strokeWidth={2.5}
          fill="url(#grad-expense)"
          isAnimationActive={!REDUCED}
          animationDuration={320}
          dot={lastDot("var(--chart-expense)", data.length - 1)}
          activeDot={{ r: 4 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  </div>
);
