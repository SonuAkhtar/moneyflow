"use client";

import { forwardRef, useId, useState, type InputHTMLAttributes } from "react";
import { Eye, EyeOff, type LucideIcon } from "lucide-react";
import { cn } from "@/utils";
import styles from "./Input.module.scss";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  icon?: LucideIcon;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    { label, error, hint, icon: Icon, className, type = "text", id, ...rest },
    ref,
  ) => {
    const [reveal, setReveal] = useState(false);
    const fallbackId = useId();
    const inputId = id ?? fallbackId;
    const isPassword = type === "password";
    const resolvedType = isPassword ? (reveal ? "text" : "password") : type;

    return (
      <div className={cn(styles.field, className)}>
        {label && (
          <label className={styles.field_label} htmlFor={inputId}>
            {label}
          </label>
        )}
        <div
          className={cn(
            styles.field_control,
            error && styles["field_control--error"],
            Icon && styles["field_control--with-icon"],
          )}
        >
          {Icon && <Icon className={styles.field_icon} size={18} />}
          <input
            ref={ref}
            id={inputId}
            type={resolvedType}
            className={styles.field_input}
            {...rest}
          />
          {isPassword && (
            <button
              type="button"
              className={styles.field_toggle}
              onClick={() => setReveal((v) => !v)}
              aria-label={reveal ? "Hide password" : "Show password"}
            >
              {reveal ? <Eye size={18} /> : <EyeOff size={18} />}
            </button>
          )}
        </div>
        {error ? (
          <span className={styles.field_error}>{error}</span>
        ) : (
          hint && <span className={styles.field_hint}>{hint}</span>
        )}
      </div>
    );
  },
);

Input.displayName = "Input";
