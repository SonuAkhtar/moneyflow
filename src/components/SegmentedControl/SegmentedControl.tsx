"use client";

import type { CSSProperties } from "react";
import { cn } from "@/utils";
import styles from "./SegmentedControl.module.scss";

interface Segment<T extends string> {
  label: string;
  value: T;
}

interface SegmentedControlProps<T extends string> {
  segments: Segment<T>[];
  value: T;
  onChange: (value: T) => void;
  size?: "sm" | "md";
  className?: string;
  "aria-label"?: string;
  "aria-labelledby"?: string;
}

export function SegmentedControl<T extends string>({
  segments,
  value,
  onChange,
  size = "md",
  className,
  "aria-label": ariaLabel,
  "aria-labelledby": ariaLabelledBy,
}: SegmentedControlProps<T>) {
  const index = segments.findIndex((segment) => segment.value === value);

  return (
    <div
      role="group"
      aria-label={ariaLabel}
      aria-labelledby={ariaLabelledBy}
      className={cn(styles.segmented, styles[`segmented--${size}`], className)}
      style={{ "--count": segments.length } as CSSProperties}
    >
      {index >= 0 && (
        <span
          aria-hidden
          className={styles.segmented_pill}
          style={{ "--index": index } as CSSProperties}
        />
      )}
      {segments.map((segment) => {
        const active = segment.value === value;
        return (
          <button
            key={segment.value}
            type="button"
            className={cn(
              styles.segmented_item,
              active && styles["segmented_item--active"],
            )}
            onClick={() => onChange(segment.value)}
            aria-pressed={active}
          >
            <span className={styles.segmented_label}>{segment.label}</span>
          </button>
        );
      })}
    </div>
  );
}
