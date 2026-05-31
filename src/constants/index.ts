import {
  ChartPie,
  CreditCard,
  LayoutGrid,
  Landmark,
  UserRound,
} from "lucide-react";
import type { NavItem } from "@/types";

export const ROUTES = {
  home: "/",
  savings: "/savings",
  analytics: "/analytics",
  emi: "/emi",
  profile: "/profile",
  onboarding: "/onboarding",
  login: "/login",
  signup: "/signup",
  forgotPassword: "/forgot-password",
  resetPassword: "/reset-password",
  verify: "/verify",
  offline: "/offline",
} as const;

export const BOTTOM_NAV: NavItem[] = [
  { href: ROUTES.savings, label: "Savings", icon: Landmark },
  { href: ROUTES.analytics, label: "Analytics", icon: ChartPie },
  { href: ROUTES.home, label: "Home", icon: LayoutGrid },
  { href: ROUTES.emi, label: "EMI", icon: CreditCard },
  { href: ROUTES.profile, label: "Profile", icon: UserRound },
];

export const CURRENCY = {
  code: "INR",
  symbol: "₹",
  locale: "en-IN",
} as const;

export const BIG_EXPENSE_THRESHOLD = 6000;

export const APP = {
  name: "moneyFlow",
  tagline: "Money that moves with you",
  description:
    "A premium fintech companion for tracking salary, savings, EMIs and spending.",
  defaultCurrency: CURRENCY.code,
  storageKeys: {
    finance: "moneyflow-finance",
    settings: "moneyflow-settings",
    onboarding: "moneyflow-onboarding",
  },
} as const;

export const ACCOUNT_COLOR_TAGS = [
  "#4ece6e",
  "#2bd4c4",
  "#f5803c",
  "#3d8bff",
  "#9b8cff",
  "#e4574d",
] as const;

export const HEALTH_THRESHOLDS = {
  excellent: 80,
  good: 60,
  fair: 40,
} as const;

export const ONBOARDING_STEPS = [
  {
    key: "welcome",
    title: "Welcome to moneyFlow",
    subtitle: "Your money, beautifully in motion.",
  },
  {
    key: "income",
    title: "Set your monthly salary",
    subtitle: "We use this to model your cash flow.",
  },
  {
    key: "savings",
    title: "Pick a savings target",
    subtitle: "How much do you want to keep each month?",
  },
  {
    key: "account",
    title: "Add your first wallet",
    subtitle: "Connect a starting balance to begin.",
  },
] as const;

export {
  CATEGORY_META,
  EXPENSE_CATEGORIES,
  QUICK_EXPENSE_CATEGORIES,
  INCOME_CATEGORIES,
  getCategoryMeta,
} from "./categories";
