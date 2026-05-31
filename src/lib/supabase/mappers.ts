// Row <-> domain mappers. DB is snake_case; the app uses camelCase.
// Postgres `numeric` can arrive as a string, so all money fields are coerced.

import type {
  Account,
  Budget,
  CategoryId,
  Emi,
  EmiPayment,
  Profile,
  Transaction,
} from "@/types";
import type { Tables, TablesInsert } from "./database.types";

const n = (v: number | string | null | undefined): number =>
  v == null ? 0 : typeof v === "number" ? v : Number(v) || 0;

export interface ProfileBundle {
  profile: Profile;
  majorAccountId: string | null;
  dailyAccountId: string | null;
}

export const rowToProfile = (r: Tables<"profiles">): ProfileBundle => ({
  profile: {
    id: r.id,
    email: r.email,
    username: r.username,
    fullName: r.full_name,
    phone: r.phone,
    avatarUrl: r.avatar_url,
    currency: r.currency,
    monthlySalary: n(r.monthly_salary),
    savingsTarget: n(r.savings_target),
    onboardingComplete: r.onboarding_complete,
    streakCount: r.streak_count,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  },
  majorAccountId: r.major_account_id,
  dailyAccountId: r.daily_account_id,
});

export const profileToUpdate = (
  patch: Partial<Profile> & {
    majorAccountId?: string | null;
    dailyAccountId?: string | null;
  },
): TablesInsert<"profiles"> => {
  const out: Record<string, unknown> = {};
  if (patch.email !== undefined) out.email = patch.email;
  if (patch.username !== undefined) out.username = patch.username;
  if (patch.fullName !== undefined) out.full_name = patch.fullName;
  if (patch.phone !== undefined) out.phone = patch.phone;
  if (patch.avatarUrl !== undefined) out.avatar_url = patch.avatarUrl;
  if (patch.currency !== undefined) out.currency = patch.currency;
  if (patch.monthlySalary !== undefined) out.monthly_salary = patch.monthlySalary;
  if (patch.savingsTarget !== undefined) out.savings_target = patch.savingsTarget;
  if (patch.onboardingComplete !== undefined)
    out.onboarding_complete = patch.onboardingComplete;
  if (patch.streakCount !== undefined) out.streak_count = patch.streakCount;
  if (patch.majorAccountId !== undefined) out.major_account_id = patch.majorAccountId;
  if (patch.dailyAccountId !== undefined) out.daily_account_id = patch.dailyAccountId;
  return out as TablesInsert<"profiles">;
};

export const rowToAccount = (r: Tables<"accounts">): Account => ({
  id: r.id,
  userId: r.user_id,
  name: r.name,
  type: r.type,
  balance: n(r.balance),
  institution: r.institution,
  colorTag: r.color_tag,
  isPrimary: r.is_primary,
  createdAt: r.created_at,
});

export const accountToRow = (a: Account): TablesInsert<"accounts"> => ({
  id: a.id,
  user_id: a.userId,
  name: a.name,
  type: a.type,
  balance: a.balance,
  institution: a.institution,
  color_tag: a.colorTag,
  is_primary: a.isPrimary,
});

export const rowToTransaction = (r: Tables<"transactions">): Transaction => ({
  id: r.id,
  userId: r.user_id,
  accountId: r.account_id,
  type: r.type,
  amount: n(r.amount),
  category: r.category as CategoryId,
  note: r.note,
  merchant: r.merchant,
  isBigExpense: r.is_big_expense,
  occurredAt: r.occurred_at,
  createdAt: r.created_at,
});

export const transactionToRow = (
  t: Transaction,
): TablesInsert<"transactions"> => ({
  id: t.id,
  user_id: t.userId,
  account_id: t.accountId,
  type: t.type,
  amount: t.amount,
  category: t.category,
  note: t.note,
  merchant: t.merchant,
  is_big_expense: t.isBigExpense,
  occurred_at: t.occurredAt,
});

export const rowToEmi = (
  r: Tables<"emis">,
  payments: EmiPayment[],
): Emi => ({
  id: r.id,
  userId: r.user_id,
  accountId: r.account_id,
  name: r.name,
  kind: r.kind,
  startMonth: r.start_month,
  principal: n(r.principal),
  monthlyAmount: n(r.monthly_amount),
  remainingMonths: r.remaining_months,
  totalMonths: r.total_months,
  paidMonths: r.paid_months,
  interestRate: n(r.interest_rate),
  dueDay: r.due_day,
  status: r.status,
  payments,
  createdAt: r.created_at,
});

export const emiToRow = (e: Emi): TablesInsert<"emis"> => ({
  id: e.id,
  user_id: e.userId,
  account_id: e.accountId,
  name: e.name,
  kind: e.kind,
  start_month: e.startMonth,
  principal: e.principal,
  monthly_amount: e.monthlyAmount,
  remaining_months: e.remainingMonths,
  total_months: e.totalMonths,
  paid_months: e.paidMonths,
  interest_rate: e.interestRate,
  due_day: e.dueDay,
  status: e.status,
});

export const rowToEmiPayment = (r: Tables<"emi_payments">): EmiPayment => ({
  id: r.id,
  month: r.month,
  amount: n(r.amount),
});

export const emiPaymentToRow = (
  p: EmiPayment,
  emiId: string,
  userId: string,
): TablesInsert<"emi_payments"> => ({
  id: p.id,
  emi_id: emiId,
  user_id: userId,
  month: p.month,
  amount: p.amount,
});

export const rowToBudget = (r: Tables<"budgets">): Budget => ({
  id: r.id,
  userId: r.user_id,
  category: r.category as CategoryId,
  limit: n(r.limit),
  spent: n(r.spent),
  month: r.month,
  createdAt: r.created_at,
});

export const budgetToRow = (b: Budget): TablesInsert<"budgets"> => ({
  id: b.id,
  user_id: b.userId,
  category: b.category,
  limit: b.limit,
  spent: b.spent,
  month: b.month,
});
