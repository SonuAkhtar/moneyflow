import type { ReactNode } from "react";
import { cn } from "@/utils";
import styles from "./Badge.module.scss";

interface BadgeProps {
  children: ReactNode;
  tone?: "lime" | "orange" | "ocean" | "danger" | "neutral";
  dot?: boolean;
  className?: string;
}

export const Badge = ({ children, tone = "neutral", dot = false, className }: BadgeProps) => (
  <span className={cn(styles.badge, styles[`badge--${tone}`], className)}>
    {dot && <span className={styles.badge_dot} />}
    {children}
  </span>
);
