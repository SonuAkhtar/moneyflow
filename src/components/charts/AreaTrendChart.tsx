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
            <stop offset="0%" stopColor="#c6f432" stopOpacity={0.5} />
            <stop offset="100%" stopColor="#c6f432" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="grad-expense" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ff7a1a" stopOpacity={0.45} />
            <stop offset="100%" stopColor="#ff7a1a" stopOpacity={0} />
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
          stroke="#c6f432"
          strokeWidth={2.5}
          fill="url(#grad-income)"
          animationDuration={900}
        />
        <Area
          type="monotone"
          dataKey="expenses"
          name="Expenses"
          stroke="#ff7a1a"
          strokeWidth={2.5}
          fill="url(#grad-expense)"
          animationDuration={900}
        />
      </AreaChart>
    </ResponsiveContainer>
  </div>
);
