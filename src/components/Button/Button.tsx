"use client";

import { forwardRef, type ReactNode } from "react";
import { m, type HTMLMotionProps } from "framer-motion";
import { Loader2, type LucideIcon } from "lucide-react";
import { cn } from "@/utils";
import type { Size, Variant } from "@/types";
import styles from "./Button.module.scss";

interface ButtonProps extends Omit<
  HTMLMotionProps<"button">,
  "ref" | "children"
> {
  variant?: Variant;
  size?: Size;
  fullWidth?: boolean;
  loading?: boolean;
  icon?: LucideIcon;
  iconRight?: LucideIcon;
  children?: ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "primary",
      size = "md",
      fullWidth = false,
      loading = false,
      icon: Icon,
      iconRight: IconRight,
      className,
      children,
      disabled,
      ...rest
    },
    ref,
  ) => (
    <m.button
      ref={ref}
      className={cn(
        styles.button,
        styles[`button--${variant}`],
        styles[`button--${size}`],
        fullWidth && styles["button--full"],
        loading && styles["button--loading"],
        className,
      )}
      data-variant={variant}
      whileTap={{ scale: disabled || loading ? 1 : 0.96 }}
      transition={{ type: "spring", stiffness: 520, damping: 34 }}
      disabled={disabled || loading}
      {...rest}
    >
      {loading ? (
        <Loader2 className={styles.button_spinner} size={18} />
      ) : (
        Icon && <Icon className={styles.button_icon} size={18} />
      )}
      {children && <span className={styles.button_label}>{children}</span>}
      {IconRight && !loading && (
        <IconRight className={styles.button_icon} size={18} />
      )}
    </m.button>
  ),
);

Button.displayName = "Button";
