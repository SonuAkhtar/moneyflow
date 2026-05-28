"use client";

import { useEffect } from "react";
import {
  animate,
  motion,
  useMotionValue,
  useTransform,
} from "framer-motion";
import { formatCurrency, formatNumber } from "@/utils";

interface AnimatedNumberProps {
  value: number;
  currency?: string;
  format?: "currency" | "number" | "raw";
  duration?: number;
  className?: string;
}

export const AnimatedNumber = ({
  value,
  currency = "INR",
  format = "currency",
  duration = 0.9,
  className,
}: AnimatedNumberProps) => {
  const motionValue = useMotionValue(0);
  const rendered = useTransform(motionValue, (latest) => {
    if (format === "currency") return formatCurrency(latest, currency);
    if (format === "number") return formatNumber(Math.round(latest));
    return String(Math.round(latest));
  });

  useEffect(() => {
    const controls = animate(motionValue, value, {
      duration,
      ease: [0.16, 1, 0.3, 1],
    });
    return controls.stop;
  }, [value, duration, motionValue]);

  return <motion.span className={className}>{rendered}</motion.span>;
};
