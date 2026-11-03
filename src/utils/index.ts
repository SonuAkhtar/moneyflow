import clsx, { type ClassValue } from "clsx";
import { addMonths, format, parseISO, startOfMonth, subMonths } from "date-fns";
import { CURRENCY, HEALTH_THRESHOLDS } from "@/constants";
import { localeForCurrency as localeFor } from "@/constants/currencies";
import type {
  Account,
  Borrowing,
  Emi,
  EmiKind,
  HealthBand,
  Transaction,
} from "@/types";

export const SAVINGS_DEPOSIT_NOTE = "Savings deposit";
export const SAVINGS_WITHDRAWAL_NOTE = "Savings withdrawal";
export const BANK_TRANSFER_OUT_NOTE = "Bank transfer out";
export const BANK_TRANSFER_IN_NOTE = "Bank transfer in";

const TRANSFER_INFLOW_NOTES = new Set<string>([
  SAVINGS_DEPOSIT_NOTE,
  BANK_TRANSFER_IN_NOTE,
]);

export const transferDelta = (amount: number, note: string | null): number =>
  note !== null && TRANSFER_INFLOW_NOTES.has(note) ? amount : -amount;

export const transactionDelta = (
  t: Pick<Transaction, "type" | "amount" | "note">,
): number => {
  if (t.type === "income") return t.amount;
  if (t.type === "transfer") return transferDelta(t.amount, t.note);
  return -t.amount;
};

export const isBankTransfer = (t: Transaction): boolean =>
  t.type === "transfer" &&
  (t.note === BANK_TRANSFER_OUT_NOTE || t.note === BANK_TRANSFER_IN_NOTE);

export const findTransferPair = (
  leg: Transaction,
  transactions: Transaction[],
): Transaction | undefined => {
  if (!isBankTransfer(leg)) return undefined;
  const want =
    leg.note === BANK_TRANSFER_OUT_NOTE
      ? BANK_TRANSFER_IN_NOTE
      : BANK_TRANSFER_OUT_NOTE;
  const at = +new Date(leg.occurredAt);
  return transactions.find(
    (t) =>
      t.id !== leg.id &&
      t.type === "transfer" &&
      t.note === want &&
      t.amount === leg.amount &&
      t.accountId !== leg.accountId &&
      +new Date(t.occurredAt) === at,
  );
};

export interface BankMonthFlow {
  added: number;
  taken: number;
  transferIn: number;
  transferOut: number;
  net: number;
  transferNet: number;
}

export const bankMonthFlow = (
  accountId: string,
  transactions: Transaction[],
  month: string,
): BankMonthFlow => {
  let added = 0;
  let taken = 0;
  let transferIn = 0;
  let transferOut = 0;
  for (const t of transactions) {
    if (t.type !== "transfer" || t.accountId !== accountId) continue;
    if (monthKey(t.occurredAt) !== month) continue;
    if (t.note === SAVINGS_DEPOSIT_NOTE) added += t.amount;
    else if (t.note === SAVINGS_WITHDRAWAL_NOTE) taken += t.amount;
    else if (t.note === BANK_TRANSFER_IN_NOTE) transferIn += t.amount;
    else if (t.note === BANK_TRANSFER_OUT_NOTE) transferOut += t.amount;
  }
  return {
    added,
    taken,
    transferIn,
    transferOut,
    net: round2(added - taken),
    transferNet: round2(transferIn - transferOut),
  };
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
    delta += transactionDelta(t);
  }
  return round2(delta);
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
  return emiScheduledAmount(e, months);
};

export const shiftMonth = (month: string, n: number): string =>
  monthKey(addMonths(parseISO(`${month}-01`), n));

/** Last instalment month of a loan with a tenure. */
export const emiEndMonth = (e: Emi): string =>
  shiftMonth(emiStartMonth(e), e.totalMonths - 1);

/** The EMI due for `month`: the latest amount change on or before it. */
export const emiAmountFor = (e: Emi, month: string): number => {
  let latest: Emi["amountChanges"][number] | undefined;
  for (const c of e.amountChanges ?? [])
    if (c.from <= month && (!latest || c.from >= latest.from)) latest = c;
  return latest?.amount ?? e.monthlyAmount;
};

/** Total of the first `months` instalments from the start month. */
export const emiScheduledAmount = (e: Emi, months: number): number => {
  if (!e.amountChanges?.length) return months * e.monthlyAmount;
  const start = emiStartMonth(e);
  let total = 0;
  for (let i = 0; i < months; i += 1)
    total += emiAmountFor(e, shiftMonth(start, i));
  return round2(total);
};

/** Standard amortised EMI, rounded to a whole unit; 0 if inputs are missing. */
export const suggestedEmi = (
  principal: number,
  annualRatePct: number,
  months: number,
): number => {
  if (!(principal > 0) || !(months > 0)) return 0;
  const r = Math.max(0, annualRatePct) / 12 / 100;
  if (r === 0) return Math.round(principal / months);
  const f = (1 + r) ** months;
  return Math.round((principal * r * f) / (f - 1));
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
    const parts = new Intl.NumberFormat(localeFor(currency), {
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
  const formatter = new Intl.NumberFormat(localeFor(currency), {
    style: "currency",
    currency,
    notation: compact ? "compact" : "standard",
    minimumFractionDigits: compact || value % 1 === 0 ? 0 : 2,
    maximumFractionDigits: compact ? 1 : value % 1 === 0 ? 0 : 2,
  });
  const formatted = formatter.format(Math.abs(value));
  if (signed) return `${value < 0 ? "-" : "+"}${formatted}`;
  return value < 0 ? `-${formatted}` : formatted;
};

export const formatCompact = (value: number): string =>
  new Intl.NumberFormat(localeFor(ACTIVE_CURRENCY), {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);

export const formatMoneyShort = (value: number): string =>
  formatCurrency(value, ACTIVE_CURRENCY, { compact: true });

export const formatPercent = (value: number, digits = 0): string =>
  `${value.toFixed(digits)}%`;

/** One "*" per whole digit, so a hidden amount keeps its rough size. */
export const maskDigits = (value: number): string =>
  "*".repeat(Math.max(1, String(Math.floor(Math.abs(value))).length));

export const formatAmount = (
  value: number,
  currency: string,
  hidden: boolean,
): string =>
  hidden
    ? `${getCurrencySymbol(currency)}${maskDigits(value)}`
    : formatCurrency(value, currency);

export const formatNumber = (value: number): string =>
  new Intl.NumberFormat(localeFor(ACTIVE_CURRENCY)).format(value);

export const initialsOf = (name: string): string =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");

export const truncate = (text: string, max = 28): string =>
  text.length > max ? `${text.slice(0, max - 1)}...` : text;

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

export const lastNMonthKeys = (n: number, endMonth?: string): string[] => {
  const end = endMonth ? parseISO(`${endMonth}-01`) : new Date();
  return Array.from({ length: n }, (_, i) =>
    monthKey(subMonths(startOfMonth(end), n - 1 - i)),
  );
};

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

export interface HealthInput {
  income: number;
  savings: number;
  emiBurden: number;
}

export const computeHealthScore = ({
  income,
  savings,
  emiBurden,
}: HealthInput): number => {
  const rate =
    income > 0 ? Math.max(0, Math.min(100, (savings / income) * 100)) : 0;
  const savingsScore = Math.min(60, rate * 0.6);
  const emiRatio =
    income > 0 ? Math.min(1, emiBurden / income) : emiBurden > 0 ? 1 : 0;
  const emiScore = (1 - emiRatio) * 40;
  return Math.round(Math.max(0, Math.min(100, savingsScore + emiScore)));
};

export const healthBand = (score: number): HealthBand => {
  if (score >= HEALTH_THRESHOLDS.excellent) return "excellent";
  if (score >= HEALTH_THRESHOLDS.good) return "good";
  if (score >= HEALTH_THRESHOLDS.fair) return "fair";
  return "poor";
};

export const round2 = (value: number): number => Math.round(value * 100) / 100;

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
  round2(sumBy(b.payments ?? [], (p) => p.amount));

export const borrowingOutstanding = (b: Borrowing): number =>
  Math.max(0, round2(b.amount - borrowingRepaid(b)));

export const borrowingSettled = (b: Borrowing): boolean =>
  borrowingOutstanding(b) <= 0;

export const isCreditCard = (a: Pick<Account, "type">): boolean =>
  a.type === "card";

export const accountLabel = (a: Account, currency?: string): string =>
  isCreditCard(a)
    ? `${a.name} · ${formatCurrency(Math.max(0, -a.balance), currency)} due`
    : `${a.name} · ${formatCurrency(a.balance, currency)}`;
