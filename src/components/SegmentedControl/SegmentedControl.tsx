"use client";

import { useId } from "react";
import { m } from "framer-motion";
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
}

export function SegmentedControl<T extends string>({
  segments,
  value,
  onChange,
  size = "md",
  className,
}: SegmentedControlProps<T>) {
  const groupId = useId();

  return (
    <div className={cn(styles.segmented, styles[`segmented--${size}`], className)}>
      {segments.map((segment) => {
        const active = segment.value === value;
        return (
          <button
            key={segment.value}
            type="button"
            className={cn(styles.segmented_item, active && styles["segmented_item--active"])}
            onClick={() => onChange(segment.value)}
          >
            {active && (
              <m.span
                layoutId={`segmented-${groupId}`}
                className={styles.segmented_pill}
                transition={{ type: "spring", stiffness: 420, damping: 34 }}
              />
            )}
            <span className={styles.segmented_label}>{segment.label}</span>
          </button>
        );
      })}
    </div>
  );
}
