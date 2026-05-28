"use client";

import { ACCOUNT_COLOR_TAGS } from "@/constants";
import { cn } from "@/utils";
import styles from "./ColorPicker.module.scss";

interface ColorPickerProps {
  value: string;
  onChange: (color: string) => void;
  label?: string;
}

export const ColorPicker = ({ value, onChange, label = "Color" }: ColorPickerProps) => (
  <div className={styles.picker}>
    <span className={styles.picker_label}>{label}</span>
    <div className={styles.picker_row}>
      {ACCOUNT_COLOR_TAGS.map((color) => (
        <button
          key={color}
          type="button"
          className={cn(styles.picker_dot, value === color && styles["picker_dot--active"])}
          style={{ background: color }}
          onClick={() => onChange(color)}
          aria-label={`Color ${color}`}
        />
      ))}
    </div>
  </div>
);
