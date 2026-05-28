"use client";

import { motion } from "framer-motion";
import { cn } from "@/utils";
import styles from "./RadialProgress.module.scss";

interface RadialProgressProps {
  value: number;
  size?: number;
  stroke?: number;
  label?: string;
  caption?: string;
  gradientId?: string;
  className?: string;
}

export const RadialProgress = ({
  value,
  size = 132,
  stroke = 12,
  label,
  caption,
  gradientId = "radial-lime",
  className,
}: RadialProgressProps) => {
  const clamped = Math.max(0, Math.min(100, value));
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (clamped / 100) * circumference;

  return (
    <div className={cn(styles.radial, className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} className={styles.radial_svg}>
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#c6f432" />
            <stop offset="100%" stopColor="#2bff95" />
          </linearGradient>
        </defs>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--surface-input)"
          strokeWidth={stroke}
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={`url(#${gradientId})`}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <div className={styles.radial_center}>
        {label && <span className={styles.radial_value}>{label}</span>}
        {caption && <span className={styles.radial_caption}>{caption}</span>}
      </div>
    </div>
  );
};
