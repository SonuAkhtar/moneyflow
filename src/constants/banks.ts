import { Banknote, Building2, CreditCard, Landmark, PiggyBank, Wallet } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface BankPreset {
  id: string;
  name: string;
  icon: LucideIcon;
  color: string;
}

export const BANK_PRESETS: BankPreset[] = [
  { id: "kotak", name: "Kotak", icon: Wallet, color: "#e4574d" },
  { id: "hdfc", name: "HDFC", icon: Landmark, color: "#3d8bff" },
  { id: "central", name: "Central Bank", icon: Building2, color: "#2bd4c4" },
  { id: "icici", name: "ICICI", icon: Banknote, color: "#f5803c" },
  { id: "sbi", name: "SBI", icon: CreditCard, color: "#9b8cff" },
  { id: "other", name: "Other", icon: PiggyBank, color: "#4ece6e" },
];

export const getBankByName = (name: string): BankPreset | undefined =>
  BANK_PRESETS.find((b) => b.name.toLowerCase() === name.trim().toLowerCase());
