"use client";

import { useId } from "react";
import { cn, currentDateKey, dateKey } from "@/utils";
import styles from "./DateField.module.scss";

interface DateFieldProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  max?: string;
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
}: DateFieldProps) => {
  const labelId = useId();
  const inputId = useId();
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
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </button>
        ))}
        <input
          id={inputId}
          type="date"
          className={styles.date_input}
          max={max}
          value={value}
          onChange={(e) => e.target.value && onChange(e.target.value)}
        />
      </div>
    </div>
  );
};
