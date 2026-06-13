import clsx, { type ClassValue } from "clsx";
import { format, parseISO, startOfMonth, subMonths } from "date-fns";
import { CURRENCY, HEALTH_THRESHOLDS } from "@/constants";
import type { Borrowing, Emi, EmiKind, HealthBand, Transaction } from "@/types";

export const SAVINGS_DEPOSIT_NOTE = "Savings deposit";
export const SAVINGS_WITHDRAWAL_NOTE = "Savings withdrawal";

export const bankMonthFlow = (
  accountId: string,
  transactions: Transaction[],
  month: string,
): { added: number; taken: number; net: number } => {
  let added = 0;
  let taken = 0;
  for (const t of transactions) {
    if (t.type !== "transfer" || t.accountId !== accountId) continue;
    if (monthKey(t.occurredAt) !== month) continue;
    if (t.note === SAVINGS_DEPOSIT_NOTE) added += t.amount;
    else if (t.note === SAVINGS_WITHDRAWAL_NOTE) taken += t.amount;
  }
  return { added, taken, net: added - taken };
};

export const accountMonthDelta = (
  accountId: string,
  transactions: Transaction[],
  month: string,
): number => {
  let delta = 0;
  for (const t of transactions) {
    if (t.accountId !== accountId) continue;
    if (monthKey(t.occurredAt) !== month) continue;
    if (t.type === "income") {
      if (t.category === "salary") continue;
      delta += t.amount;
    } else if (t.type === "transfer" && t.note === SAVINGS_DEPOSIT_NOTE) {
      delta += t.amount;
    } else {
      delta -= t.amount;
    }
  }
  return delta;
};

const SIP_NAMES = ["SIP", "Mutual Funds"];
export const emiKind = (e: Emi): EmiKind =>
  e.kind ?? (SIP_NAMES.includes(e.name) ? "sip" : "loan");
export const emiPaidMonths = (e: Emi): number =>
  e.paidMonths ?? Math.max(0, e.totalMonths - e.remainingMonths);
export const emiStartMonth = (e: Emi): string =>
  e.startMonth ?? monthKey(e.createdAt);

export const emiPaidAmount = (e: Emi): number => {
  if (emiKind(e) === "sip") {
    const logged = (e.payments ?? []).reduce((acc, p) => acc + p.amount, 0);
    return e.principal + logged;
  }
  const months =
    e.totalMonths > 0
      ? Math.min(emiPaidMonths(e), e.totalMonths)
      : emiPaidMonths(e);
  return months * e.monthlyAmount;
};

export const cn = (...inputs: ClassValue[]): string => clsx(inputs);

export const createId = (prefix = "id"): string => {
  const random =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2);
  return `${prefix}_${random}`;
};

let ACTIVE_CURRENCY: string = CURRENCY.code;

export const setActiveCurrency = (code: string | null | undefined): void => {
  ACTIVE_CURRENCY = code || CURRENCY.code;
};

export const getCurrencySymbol = (
  currency: string = ACTIVE_CURRENCY,
): string => {
  try {
    const parts = new Intl.NumberFormat(CURRENCY.locale, {
      style: "currency",
      currency,
    }).formatToParts(0);
    return parts.find((p) => p.type === "currency")?.value ?? CURRENCY.symbol;
  } catch {
    return CURRENCY.symbol;
  }
};

export const formatCurrency = (
  value: number,
  currency: string = ACTIVE_CURRENCY,
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

export const formatMoneyShort = (value: number): string => {
  const abs = Math.abs(value);
  const sign = value < 0 ? "-" : "";
  const num = (n: number): string =>
    new Intl.NumberFormat(CURRENCY.locale, { maximumFractionDigits: 2 }).format(
      n,
    );
  if (abs >= 1e7) return `${sign}${CURRENCY.symbol}${num(abs / 1e7)}Cr`;
  if (abs >= 1e5) return `${sign}${CURRENCY.symbol}${num(abs / 1e5)}L`;
  return `${sign}${CURRENCY.symbol}${num(abs)}`;
};

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

export const dateKey = (date: Date | string = new Date()): string => {
  const d = typeof date === "string" ? parseISO(date) : date;
  return format(d, "yyyy-MM-dd");
};

export const currentDateKey = (): string => dateKey(new Date());

export const currentStreak = (transactions: Transaction[]): number => {
  if (transactions.length === 0) return 0;
  const days = new Set(transactions.map((t) => dateKey(t.occurredAt)));
  const cursor = new Date();
  if (!days.has(dateKey(cursor))) cursor.setDate(cursor.getDate() - 1);
  let streak = 0;
  while (days.has(dateKey(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
};

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

export const dayLabel = (date: string | Date): string => {
  const d = typeof date === "string" ? parseISO(date) : date;
  return format(d, "EEE, d MMM");
};

export const dayShort = (date: string | Date): string => {
  const d = typeof date === "string" ? parseISO(date) : date;
  return format(d, "d MMM");
};

export const isoNow = (): string => new Date().toISOString();

export const dateInputToIso = (dateStr: string): string =>
  new Date(`${dateStr}T12:00:00`).toISOString();

export const savingsRate = (income: number, expenses: number): number => {
  if (income <= 0) return 0;
  return Math.max(0, Math.min(100, ((income - expenses) / income) * 100));
};

export interface HealthInput {
  income: number;
  expenses: number;
  savings: number;
  emiBurden: number;
}

export const computeHealthScore = ({
  income,
  expenses,
  savings,
  emiBurden,
}: HealthInput): number => {
  const rate = savingsRate(income, expenses);
  const savingsScore = Math.min(60, (savings > 0 ? rate : 0) * 0.6);
  const emiRatio = income > 0 ? Math.min(1, emiBurden / income) : 1;
  const emiScore = (1 - emiRatio) * 40;
  return Math.round(Math.max(0, Math.min(100, savingsScore + emiScore)));
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

export const borrowingRepaid = (b: Borrowing): number =>
  sumBy(b.payments ?? [], (p) => p.amount);

export const borrowingOutstanding = (b: Borrowing): number =>
  Math.max(0, Math.round((b.amount - borrowingRepaid(b)) * 100) / 100);

export const borrowingSettled = (b: Borrowing): boolean =>
  borrowingRepaid(b) >= b.amount;
