"use client";

import { useLayoutEffect, useRef } from "react";
import { cn, getCurrencySymbol } from "@/utils";
import styles from "./AmountField.module.scss";

interface AmountFieldProps {
  value: string;
  onChange: (value: string) => void;
  symbol?: string;
  placeholder?: string;
  autoFocus?: boolean;
  tone?: "success" | "danger";
  id?: string;
  "aria-label"?: string;
  "aria-invalid"?: boolean;
  "aria-describedby"?: string;
}

const sanitizeAmount = (raw: string): string => {
  const cleaned = raw.replace(/[^0-9.]/g, "");
  const dot = cleaned.indexOf(".");
  const intPart = (dot === -1 ? cleaned : cleaned.slice(0, dot)).slice(0, 10);
  if (dot === -1) return intPart;
  const decPart = cleaned
    .slice(dot + 1)
    .replace(/\./g, "")
    .slice(0, 2);
  return `${intPart}.${decPart}`;
};

export const AmountField = ({
  value,
  onChange,
  symbol = getCurrencySymbol(),
  placeholder = "0",
  autoFocus = false,
  tone,
  id,
  "aria-label": ariaLabel = "Amount",
  "aria-invalid": ariaInvalid,
  "aria-describedby": ariaDescribedBy,
}: AmountFieldProps) => {
  const inputRef = useRef<HTMLInputElement>(null);

  useLayoutEffect(() => {
    if (autoFocus) inputRef.current?.focus({ preventScroll: true });
  }, [autoFocus]);

  return (
    <div className={cn(styles.amount, tone && styles[`amount--${tone}`])}>
      <span className={styles.amount_symbol}>{symbol}</span>
      <input
        ref={inputRef}
        id={id}
        className={styles.amount_input}
        inputMode="decimal"
        aria-label={ariaLabel}
        aria-invalid={ariaInvalid || undefined}
        aria-describedby={ariaDescribedBy}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(sanitizeAmount(e.target.value))}
      />
    </div>
  );
};
