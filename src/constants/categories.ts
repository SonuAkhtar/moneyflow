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
  food: { id: "food", label: "Food & Dining", icon: Utensils, color: "#f5803c" },
  groceries: {
    id: "groceries",
    label: "Groceries",
    icon: ShoppingCart,
    color: "#2bd4c4",
  },
  transport: { id: "transport", label: "Transport", icon: Bus, color: "#3d8bff" },
  shopping: {
    id: "shopping",
    label: "Shopping",
    icon: ShoppingBag,
    color: "#9b8cff",
  },
  bills: { id: "bills", label: "Bills & Utilities", icon: Banknote, color: "#ffb23e" },
  rent: { id: "rent", label: "Rent", icon: Home, color: "#e4574d" },
  entertainment: {
    id: "entertainment",
    label: "Entertainment",
    icon: Clapperboard,
    color: "#4ece6e",
  },
  health: { id: "health", label: "Health", icon: HeartPulse, color: "#2bd4c4" },
  education: {
    id: "education",
    label: "Education",
    icon: GraduationCap,
    color: "#3d8bff",
  },
  travel: { id: "travel", label: "Travel", icon: Plane, color: "#ffa24d" },
  subscriptions: {
    id: "subscriptions",
    label: "Subscriptions",
    icon: Repeat,
    color: "#9b8cff",
  },
  emi: { id: "emi", label: "EMI", icon: CreditCard, color: "#e4574d" },
  salary: { id: "salary", label: "Salary", icon: Wallet, color: "#4ece6e" },
  investment: {
    id: "investment",
    label: "Investment",
    icon: TrendingUp,
    color: "#2bd4c4",
  },
  transfer: { id: "transfer", label: "Transfer", icon: PiggyBank, color: "#3d8bff" },
  other: { id: "other", label: "Other", icon: Gift, color: "#ffb23e" },
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

export const INCOME_CATEGORIES: CategoryId[] = ["salary", "investment", "other"];

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
