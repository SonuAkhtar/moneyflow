"use client";

import { useId, useState } from "react";
import { cn, currentDateKey, dateKey } from "@/utils";
import styles from "./DateField.module.scss";

interface DateFieldProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  max?: string;
  min?: string;
}

const yesterdayKey = () => {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return dateKey(d);
};

export const DateField = ({
  value,
  onChange,
  label = "Date",
  max = currentDateKey(),
  min,
}: DateFieldProps) => {
  const labelId = useId();
  const inputId = useId();
  const errorId = useId();
  const [error, setError] = useState<string | null>(null);

  // Typed dates bypass the picker's min/max, so reject them here.
  const handleInput = (next: string) => {
    if (!next) return;
    if (next > max || (min && next < min)) {
      setError(
        next > max
          ? `Date can't be later than ${max}`
          : `Date can't be earlier than ${min}`,
      );
      return;
    }
    setError(null);
    onChange(next);
  };
  const quick = [
    { label: "Today", value: currentDateKey() },
    { label: "Yesterday", value: yesterdayKey() },
  ];

  return (
    <div className={styles.date} role="group" aria-labelledby={labelId}>
      <label id={labelId} htmlFor={inputId} className={styles.date_label}>
        {label}
      </label>
      <div className={styles.date_row}>
        {quick.map((option) => (
          <button
            key={option.label}
            type="button"
            className={cn(
              styles.date_chip,
              value === option.value && styles["date_chip--active"],
            )}
            aria-pressed={value === option.value}
            onClick={() => {
              setError(null);
              onChange(option.value);
            }}
          >
            {option.label}
          </button>
        ))}
        <input
          id={inputId}
          type="date"
          className={cn(
            styles.date_input,
            error && styles["date_input--error"],
          )}
          max={max}
          min={min}
          value={value}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          onChange={(e) => handleInput(e.target.value)}
        />
      </div>
      {error && (
        <span id={errorId} role="alert" className={styles.date_error}>
          {error}
        </span>
      )}
    </div>
  );
};
