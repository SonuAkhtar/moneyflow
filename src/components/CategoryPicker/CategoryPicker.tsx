"use client";

import { m } from "framer-motion";
import { getCategoryMeta } from "@/constants/categories";
import { cn } from "@/utils";
import type { CategoryId } from "@/types";
import styles from "./CategoryPicker.module.scss";

interface CategoryPickerProps {
  categories: CategoryId[];
  value: CategoryId;
  onChange: (value: CategoryId) => void;
}

export const CategoryPicker = ({ categories, value, onChange }: CategoryPickerProps) => (
  <div className={styles.grid}>
    {categories.map((id) => {
      const meta = getCategoryMeta(id);
      const Icon = meta.icon;
      const active = id === value;
      return (
        <m.button
          key={id}
          type="button"
          className={cn(styles.chip, active && styles["chip--active"])}
          onClick={() => onChange(id)}
          whileTap={{ scale: 0.94 }}
        >
          <span className={styles.chip_icon}>
            <Icon size={18} />
          </span>
          <span className={styles.chip_label}>{meta.label}</span>
        </m.button>
      );
    })}
  </div>
);
