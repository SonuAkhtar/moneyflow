"use client";

import { forwardRef, useId, type SelectHTMLAttributes } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/utils";
import type { SelectOption } from "@/types";
import styles from "./Select.module.scss";

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: SelectOption[];
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, options, className, id, ...rest }, ref) => {
    const fallbackId = useId();
    const selectId = id ?? fallbackId;
    return (
      <div className={cn(styles.field, className)}>
        {label && (
          <label className={styles.field_label} htmlFor={selectId}>
            {label}
          </label>
        )}
        <div
          className={cn(
            styles.field_control,
            error && styles["field_control--error"],
          )}
        >
          <select
            ref={ref}
            id={selectId}
            className={styles.field_select}
            {...rest}
          >
            {options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <ChevronDown className={styles.field_chevron} size={18} />
        </div>
        {error && <span className={styles.field_error}>{error}</span>}
      </div>
    );
  },
);

Select.displayName = "Select";
