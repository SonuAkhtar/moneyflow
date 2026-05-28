import {
  LayoutDashboard,
  PieChart,
  Plus,
  Sparkles,
  Wallet,
} from "lucide-react";
import type { NavItem } from "@/types";

export const ROUTES = {
  home: "/",
  analytics: "/analytics",
  add: "/add",
  wallets: "/wallets",
  insights: "/insights",
  profile: "/profile",
  goals: "/goals",
  subscriptions: "/subscriptions",
  calendar: "/calendar",
  onboarding: "/onboarding",
  login: "/login",
  signup: "/signup",
  forgotPassword: "/forgot-password",
  verify: "/verify",
  offline: "/offline",
} as const;

export const BOTTOM_NAV: NavItem[] = [
  { href: ROUTES.home, label: "Home", icon: LayoutDashboard },
  { href: ROUTES.analytics, label: "Analytics", icon: PieChart },
  { href: ROUTES.add, label: "Add", icon: Plus, isAction: true },
  { href: ROUTES.wallets, label: "Wallets", icon: Wallet },
  { href: ROUTES.insights, label: "AI", icon: Sparkles },
];

export const CURRENCY = {
  code: "INR",
  symbol: "₹",
  locale: "en-IN",
} as const;

export const DEMO_USER = {
  id: "local-user",
  email: "you@moneyflow.app",
  fullName: "Jordan Avery",
} as const;

export const BIG_EXPENSE_THRESHOLD = 6000;

export const APP = {
  name: "moneyFlow",
  tagline: "Money that moves with you",
  description:
    "A premium fintech companion for tracking salary, savings, EMIs and smart AI-driven budgets.",
  defaultCurrency: CURRENCY.code,
  storageKeys: {
    finance: "moneyflow-finance",
    settings: "moneyflow-settings",
    onboarding: "moneyflow-onboarding",
  },
} as const;

export const ACCOUNT_COLOR_TAGS = [
  "#c6f432",
  "#2bff95",
  "#ff7a1a",
  "#57b8ff",
  "#9b8cff",
  "#ff5470",
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
  INCOME_CATEGORIES,
  getCategoryMeta,
} from "./categories";
