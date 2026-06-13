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

export type EmiStatus = "active" | "closed" | "overdue";

export type EmiKind = "loan" | "sip";

export type HealthBand = "excellent" | "good" | "fair" | "poor";

export interface Profile {
  id: string;
  email: string;
  username: string | null;
  fullName: string;
  phone: string | null;
  avatarUrl: string | null;
  currency: string;
  monthlySalary: number;
  savingsTarget: number;
  onboardingComplete: boolean;
  streakCount: number;
  createdAt: string;
  updatedAt: string;
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
  kind: EmiKind;
  startMonth: string;
  principal: number;
  monthlyAmount: number;
  remainingMonths: number;
  totalMonths: number;
  paidMonths: number;
  interestRate: number;
  dueDay: number;
  status: EmiStatus;
  payments: EmiPayment[];
  createdAt: string;
}

export interface EmiPayment {
  id: string;
  month: string;
  paidOn: string;
  amount: number;
  accountId: string | null;
}

export interface Borrowing {
  id: string;
  userId: string;
  lender: string;
  purpose: string | null;
  amount: number;
  borrowedOn: string;
  dueDate: string | null;
  note: string | null;
  payments: BorrowingPayment[];
  createdAt: string;
}

export interface BorrowingPayment {
  id: string;
  paidOn: string;
  amount: number;
  note: string | null;
}

export interface BorrowingInput {
  lender: string;
  purpose?: string;
  amount: number;
  borrowedOn: string;
  dueDate?: string;
  note?: string;
}

export interface SignUpInput {
  fullName: string;
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export interface SignInInput {
  identifier: string;
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

export interface EmiInput {
  name: string;
  kind: EmiKind;
  startMonth: string;
  principal: number;
  monthlyAmount: number;
  totalMonths: number;
  remainingMonths: number;
  paidMonths: number;
  interestRate: number;
  dueDay: number;
}

export type Variant = "primary" | "secondary" | "ghost" | "danger" | "glass";
export type Size = "sm" | "md" | "lg";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
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
