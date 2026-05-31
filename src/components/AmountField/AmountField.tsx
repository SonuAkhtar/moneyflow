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
      onChange={(e) => onChange(e.target.value)}
      autoFocus={autoFocus}
    />
  </div>
);
