"use client";

import { cn, getCurrencySymbol } from "@/utils";
import styles from "./AmountField.module.scss";

interface AmountFieldProps {
  value: string;
  onChange: (value: string) => void;
  symbol?: string;
  placeholder?: string;
  autoFocus?: boolean;
  tone?: "success" | "danger";
}

// Keep only digits and a single decimal point so values like "1e3", "-5",
// letters, or "1.2.3" can't reach the store via Number().
const sanitizeAmount = (raw: string): string => {
  const cleaned = raw.replace(/[^0-9.]/g, "");
  const dot = cleaned.indexOf(".");
  if (dot === -1) return cleaned;
  return cleaned.slice(0, dot + 1) + cleaned.slice(dot + 1).replace(/\./g, "");
};

export const AmountField = ({
  value,
  onChange,
  symbol = getCurrencySymbol(),
  placeholder = "0",
  autoFocus = false,
  tone,
}: AmountFieldProps) => (
  <div className={cn(styles.amount, tone && styles[`amount--${tone}`])}>
    <span className={styles.amount_symbol}>{symbol}</span>
    <input
      className={styles.amount_input}
      inputMode="decimal"
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(sanitizeAmount(e.target.value))}
      autoFocus={autoFocus}
    />
  </div>
);
