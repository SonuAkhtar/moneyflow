"use client";

import { forwardRef, type TextareaHTMLAttributes } from "react";
import { cn } from "@/utils";
import styles from "./Textarea.module.scss";

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, className, id, rows = 3, ...rest }, ref) => (
    <div className={cn(styles.field, className)}>
      {label && (
        <label className={styles.field_label} htmlFor={id}>
          {label}
        </label>
      )}
      <textarea
        ref={ref}
        id={id}
        rows={rows}
        className={cn(
          styles.field_input,
          error && styles["field_input--error"],
        )}
        {...rest}
      />
      {error && <span className={styles.field_error}>{error}</span>}
    </div>
  ),
);

Textarea.displayName = "Textarea";
