"use client";

import { m } from "framer-motion";
import { CalendarDays, IndianRupee } from "lucide-react";
import { cn } from "@/utils";
import styles from "./SortToggle.module.scss";

export type SortKey = "amount" | "date";

const OPTIONS = [
  { value: "amount", label: "Sort by amount", icon: IndianRupee },
  { value: "date", label: "Sort by date", icon: CalendarDays },
] as const;

interface SortToggleProps {
  value: SortKey;
  onChange: (value: SortKey) => void;
  label: string;
  className?: string;
}

export const SortToggle = ({
  value,
  onChange,
  label,
  className,
}: SortToggleProps) => (
  <div className={cn(styles.sort, className)} role="group" aria-label={label}>
    {OPTIONS.map((option) => {
      const active = value === option.value;
      return (
        <button
          key={option.value}
          type="button"
          className={cn(
            styles.sort_item,
            active && styles["sort_item--active"],
          )}
          aria-pressed={active}
          aria-label={option.label}
          title={option.label}
          onClick={() => onChange(option.value)}
        >
          {active && (
            <m.span
              layoutId={`sort-pill-${label}`}
              className={styles.sort_pill}
              transition={{ type: "spring", stiffness: 520, damping: 36 }}
            />
          )}
          <option.icon size={15} className={styles.sort_icon} />
        </button>
      );
    })}
  </div>
);
