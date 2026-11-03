"use client";

import type { CSSProperties } from "react";
import { m } from "framer-motion";
import { getCategoryMeta } from "@/constants/categories";
import { cn } from "@/utils";
import type { CategoryId } from "@/types";
import styles from "./CategoryPicker.module.scss";

interface CategoryPickerProps {
  categories: CategoryId[];
  value: CategoryId;
  onChange: (value: CategoryId) => void;
  label?: string;
  labelledBy?: string;
}

export const CategoryPicker = ({
  categories,
  value,
  onChange,
  label = "Category",
  labelledBy,
}: CategoryPickerProps) => (
  <div
    className={styles.grid}
    // One row for up to 5 categories, otherwise two rows.
    style={
      {
        "--cols":
          categories.length <= 5
            ? categories.length
            : Math.ceil(categories.length / 2),
      } as CSSProperties
    }
    role="group"
    aria-label={labelledBy ? undefined : label}
    aria-labelledby={labelledBy}
  >
    {categories.map((id) => {
      const meta = getCategoryMeta(id);
      const Icon = meta.icon;
      const active = id === value;
      return (
        <m.button
          key={id}
          type="button"
          className={cn(styles.chip, active && styles["chip--active"])}
          aria-pressed={active}
          onClick={() => onChange(id)}
          whileTap={{ scale: 0.94 }}
        >
          <span className={styles.chip_icon}>
            <Icon size={16} />
          </span>
          <span className={styles.chip_label}>{meta.label}</span>
        </m.button>
      );
    })}
  </div>
);
