import {
  Banknote,
  Bus,
  Clapperboard,
  CreditCard,
  Gift,
  GraduationCap,
  HeartPulse,
  Home,
  PiggyBank,
  Plane,
  Repeat,
  ShoppingBag,
  ShoppingCart,
  TrendingUp,
  Utensils,
  Wallet,
} from "lucide-react";
import type { CategoryId, CategoryMeta } from "@/types";

export const CATEGORY_META: Record<CategoryId, CategoryMeta> = {
  food: {
    id: "food",
    label: "Food & Dining",
    icon: Utensils,
    color: "#ff8a4c",
  },
  groceries: {
    id: "groceries",
    label: "Groceries",
    icon: ShoppingCart,
    color: "#16c784",
  },
  transport: {
    id: "transport",
    label: "Transport",
    icon: Bus,
    color: "#4c8dff",
  },
  shopping: {
    id: "shopping",
    label: "Shopping",
    icon: ShoppingBag,
    color: "#b57bff",
  },
  bills: {
    id: "bills",
    label: "Bills & Utilities",
    icon: Banknote,
    color: "#f4b740",
  },
  rent: { id: "rent", label: "Rent", icon: Home, color: "#f2555a" },
  entertainment: {
    id: "entertainment",
    label: "Entertainment",
    icon: Clapperboard,
    color: "#ff6f9c",
  },
  health: { id: "health", label: "Health", icon: HeartPulse, color: "#2bd4c4" },
  education: {
    id: "education",
    label: "Education",
    icon: GraduationCap,
    color: "#6c8bff",
  },
  travel: { id: "travel", label: "Travel", icon: Plane, color: "#34ce89" },
  subscriptions: {
    id: "subscriptions",
    label: "Subscriptions",
    icon: Repeat,
    color: "#9b8cff",
  },
  emi: { id: "emi", label: "EMI", icon: CreditCard, color: "#e0566b" },
  salary: { id: "salary", label: "Salary", icon: Wallet, color: "#16c784" },
  investment: {
    id: "investment",
    label: "Investment",
    icon: TrendingUp,
    color: "#15b8a6",
  },
  transfer: {
    id: "transfer",
    label: "Transfer",
    icon: PiggyBank,
    color: "#7c8ba3",
  },
  other: { id: "other", label: "Other", icon: Gift, color: "#8a94a6" },
};

export const EXPENSE_CATEGORIES: CategoryId[] = [
  "food",
  "groceries",
  "transport",
  "shopping",
  "bills",
  "rent",
  "entertainment",
  "health",
  "education",
  "travel",
  "subscriptions",
  "emi",
  "other",
];

export const INCOME_CATEGORIES: CategoryId[] = [
  "salary",
  "investment",
  "other",
];

export const QUICK_EXPENSE_CATEGORIES: CategoryId[] = [
  "food",
  "groceries",
  "transport",
  "shopping",
  "bills",
  "rent",
  "entertainment",
  "travel",
  "other",
];

export const getCategoryMeta = (id: CategoryId): CategoryMeta =>
  CATEGORY_META[id] ?? CATEGORY_META.other;
