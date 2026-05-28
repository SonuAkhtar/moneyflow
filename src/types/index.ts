import type { LucideIcon } from "lucide-react";

export type TransactionType = "income" | "expense" | "transfer";
export type AccountType = "bank" | "wallet" | "cash" | "card" | "savings";

export type CategoryId =
  | "food"
  | "groceries"
  | "transport"
  | "shopping"
  | "bills"
  | "rent"
  | "entertainment"
  | "health"
  | "education"
  | "travel"
  | "subscriptions"
  | "emi"
  | "salary"
  | "investment"
  | "transfer"
  | "other";

export type GoalStatus = "active" | "completed" | "paused";
export type EmiStatus = "active" | "closed" | "overdue";
export type SubscriptionCycle = "weekly" | "monthly" | "quarterly" | "yearly";

export type InsightType =
  | "saving"
  | "overspending"
  | "budgeting"
  | "prediction"
  | "optimization"
  | "alert"
  | "summary";

export type InsightSeverity = "positive" | "neutral" | "warning" | "critical";

export type NotificationType =
  | "alert"
  | "reminder"
  | "achievement"
  | "digest"
  | "system";

export type HealthBand = "excellent" | "good" | "fair" | "poor";

export interface Profile {
  id: string;
  email: string;
  fullName: string;
  phone: string | null;
  avatarUrl: string | null;
  currency: string;
  monthlySalary: number;
  savingsTarget: number;
  onboardingComplete: boolean;
  streakCount: number;
  createdAt: string;
}

export interface Account {
  id: string;
  userId: string;
  name: string;
  type: AccountType;
  balance: number;
  institution: string | null;
  colorTag: string;
  isPrimary: boolean;
  createdAt: string;
}

export interface Transaction {
  id: string;
  userId: string;
  accountId: string;
  type: TransactionType;
  amount: number;
  category: CategoryId;
  note: string | null;
  merchant: string | null;
  isBigExpense: boolean;
  occurredAt: string;
  createdAt: string;
}

export interface Emi {
  id: string;
  userId: string;
  accountId: string | null;
  name: string;
  principal: number;
  monthlyAmount: number;
  remainingMonths: number;
  totalMonths: number;
  interestRate: number;
  dueDay: number;
  status: EmiStatus;
  createdAt: string;
}

export interface Budget {
  id: string;
  userId: string;
  category: CategoryId;
  limit: number;
  spent: number;
  month: string;
  createdAt: string;
}

export interface SavingGoal {
  id: string;
  userId: string;
  title: string;
  targetAmount: number;
  savedAmount: number;
  deadline: string | null;
  status: GoalStatus;
  colorTag: string;
  createdAt: string;
}

export interface Subscription {
  id: string;
  userId: string;
  name: string;
  amount: number;
  cycle: SubscriptionCycle;
  category: CategoryId;
  nextChargeAt: string;
  isActive: boolean;
  createdAt: string;
}

export interface MonthlySummary {
  id: string;
  userId: string;
  month: string;
  income: number;
  expenses: number;
  saved: number;
  carriedForward: number;
  healthScore: number;
  healthBand: HealthBand;
  createdAt: string;
}

export interface AppNotification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
}

export interface SignUpInput {
  fullName: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export interface SignInInput {
  email: string;
  password: string;
}

export interface TransactionInput {
  accountId: string;
  type: TransactionType;
  amount: number;
  category: CategoryId;
  note?: string;
  merchant?: string;
  isBigExpense?: boolean;
  occurredAt: string;
}

export interface AccountInput {
  name: string;
  type: AccountType;
  balance: number;
  institution?: string;
  colorTag: string;
  isPrimary?: boolean;
}

export interface GoalInput {
  title: string;
  targetAmount: number;
  savedAmount?: number;
  deadline?: string;
  colorTag: string;
}

export interface BudgetInput {
  category: CategoryId;
  limit: number;
  month: string;
}

export interface SubscriptionInput {
  name: string;
  amount: number;
  cycle: SubscriptionCycle;
  category: CategoryId;
  nextChargeAt: string;
}

export interface AiGeneratedInsight {
  type: InsightType;
  severity: InsightSeverity;
  title: string;
  body: string;
  metric: number | null;
}

export interface AiFinancialSnapshot {
  monthlySalary: number;
  totalBalance: number;
  monthIncome: number;
  monthExpenses: number;
  monthSaved: number;
  carriedForward: number;
  topCategories: { category: string; amount: number }[];
  activeEmis: { name: string; monthlyAmount: number; remainingMonths: number }[];
  goals: { title: string; progress: number }[];
  healthScore: number;
}

export interface AiChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
}

export interface AiInsightResponse {
  insights: AiGeneratedInsight[];
  summary: string;
}

export type Variant = "primary" | "secondary" | "ghost" | "danger" | "glass";
export type Size = "sm" | "md" | "lg";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  isAction?: boolean;
}

export interface ToastMessage {
  id: string;
  title: string;
  description?: string;
  variant: "success" | "error" | "info" | "warning";
  duration?: number;
}

export interface SelectOption<T = string> {
  label: string;
  value: T;
  icon?: LucideIcon;
}

export interface CategoryMeta {
  id: string;
  label: string;
  icon: LucideIcon;
  color: string;
}
