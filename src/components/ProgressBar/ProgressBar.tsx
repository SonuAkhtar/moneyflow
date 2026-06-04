"use client";

import { m } from "framer-motion";
import { cn } from "@/utils";
import styles from "./ProgressBar.module.scss";

interface ProgressBarProps {
  value: number;
  tone?: "lime" | "orange" | "ocean" | "danger";
  size?: "sm" | "md";
  showTrackGlow?: boolean;
  className?: string;
}

export const ProgressBar = ({
  value,
  tone = "lime",
  size = "md",
  showTrackGlow = false,
  className,
}: ProgressBarProps) => {
  const clamped = Math.max(0, Math.min(100, value));

  return (
    <div
      className={cn(
        styles.progress,
        styles[`progress--${size}`],
        showTrackGlow && styles["progress--glow"],
        className,
      )}
      role="progressbar"
      aria-valuenow={Math.round(clamped)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <m.span
        className={cn(styles.progress_fill, styles[`progress_fill--${tone}`])}
        initial={{ width: 0 }}
        animate={{ width: `${clamped}%` }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      />
    </div>
  );
};
