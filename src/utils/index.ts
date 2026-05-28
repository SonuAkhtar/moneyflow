import clsx, { type ClassValue } from "clsx";
import {
  format,
  formatDistanceToNowStrict,
  parseISO,
  startOfMonth,
  subMonths,
} from "date-fns";
import { CURRENCY, HEALTH_THRESHOLDS } from "@/constants";
import type { HealthBand } from "@/types";

export const cn = (...inputs: ClassValue[]): string => clsx(inputs);

export const createId = (prefix = "id"): string => {
  const random =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2);
  return `${prefix}_${random}`;
};

export const getCurrencySymbol = (): string => CURRENCY.symbol;

export const formatCurrency = (
  value: number,
  currency: string = CURRENCY.code,
  options: { compact?: boolean; signed?: boolean } = {},
): string => {
  const { compact = false, signed = false } = options;
  const formatter = new Intl.NumberFormat(CURRENCY.locale, {
    style: "currency",
    currency,
    notation: compact ? "compact" : "standard",
    maximumFractionDigits: compact ? 1 : value % 1 === 0 ? 0 : 2,
  });
  const formatted = formatter.format(Math.abs(value));
  if (signed) return `${value < 0 ? "-" : "+"}${formatted}`;
  return value < 0 ? `-${formatted}` : formatted;
};

export const formatCompact = (value: number): string =>
  new Intl.NumberFormat(CURRENCY.locale, {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);

export const formatPercent = (value: number, digits = 0): string =>
  `${value.toFixed(digits)}%`;

export const formatNumber = (value: number): string =>
  new Intl.NumberFormat(CURRENCY.locale).format(value);

export const initialsOf = (name: string): string =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");

export const truncate = (text: string, max = 28): string =>
  text.length > max ? `${text.slice(0, max - 1)}…` : text;

export const monthKey = (date: Date | string = new Date()): string => {
  const d = typeof date === "string" ? parseISO(date) : date;
  return format(d, "yyyy-MM");
};

export const currentMonthKey = (): string => monthKey(new Date());

export const monthLabel = (key: string): string => {
  const [year, month] = key.split("-").map(Number);
  return format(new Date(year ?? 0, (month ?? 1) - 1, 1), "MMMM yyyy");
};

export const shortMonthLabel = (date: Date | string): string => {
  const d = typeof date === "string" ? parseISO(date) : date;
  return format(d, "MMM");
};

export const lastNMonthKeys = (n: number): string[] =>
  Array.from({ length: n }, (_, i) =>
    monthKey(subMonths(startOfMonth(new Date()), n - 1 - i)),
  );

export const relativeTime = (date: string): string =>
  formatDistanceToNowStrict(parseISO(date), { addSuffix: true });

export const dayLabel = (date: string | Date): string => {
  const d = typeof date === "string" ? parseISO(date) : date;
  return format(d, "EEE, d MMM");
};

export const timeLabel = (date: string | Date): string => {
  const d = typeof date === "string" ? parseISO(date) : date;
  return format(d, "h:mm a");
};

export const isoNow = (): string => new Date().toISOString();

export const savingsRate = (income: number, expenses: number): number => {
  if (income <= 0) return 0;
  return Math.max(0, Math.min(100, ((income - expenses) / income) * 100));
};

export const budgetUsage = (spent: number, limit: number): number => {
  if (limit <= 0) return 0;
  return Math.min(999, (spent / limit) * 100);
};

export const goalProgress = (saved: number, target: number): number => {
  if (target <= 0) return 0;
  return Math.min(100, (saved / target) * 100);
};

export interface HealthInput {
  income: number;
  expenses: number;
  savings: number;
  emiBurden: number;
  budgetAdherence: number;
}

export const computeHealthScore = ({
  income,
  expenses,
  savings,
  emiBurden,
  budgetAdherence,
}: HealthInput): number => {
  const rate = savingsRate(income, expenses);
  const savingsScore = Math.min(40, (savings > 0 ? rate : 0) * 0.4);
  const emiRatio = income > 0 ? Math.min(1, emiBurden / income) : 1;
  const emiScore = (1 - emiRatio) * 30;
  const adherenceScore = Math.min(30, budgetAdherence * 0.3);
  return Math.round(
    Math.max(0, Math.min(100, savingsScore + emiScore + adherenceScore)),
  );
};

export const healthBand = (score: number): HealthBand => {
  if (score >= HEALTH_THRESHOLDS.excellent) return "excellent";
  if (score >= HEALTH_THRESHOLDS.good) return "good";
  if (score >= HEALTH_THRESHOLDS.fair) return "fair";
  return "poor";
};

export const sumBy = <T>(items: T[], selector: (item: T) => number): number =>
  items.reduce((acc, item) => acc + selector(item), 0);

export const groupSum = <T>(
  items: T[],
  keyOf: (item: T) => string,
  valueOf: (item: T) => number,
): Record<string, number> =>
  items.reduce<Record<string, number>>((acc, item) => {
    const key = keyOf(item);
    acc[key] = (acc[key] ?? 0) + valueOf(item);
    return acc;
  }, {});
