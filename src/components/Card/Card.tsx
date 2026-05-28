"use client";

import { forwardRef } from "react";
import { motion, type HTMLMotionProps } from "framer-motion";
import { cn } from "@/utils";
import styles from "./Card.module.scss";

interface CardProps extends Omit<HTMLMotionProps<"div">, "ref"> {
  surface?: "solid" | "glass" | "gradient";
  glow?: "lime" | "orange" | "none";
  interactive?: boolean;
  padded?: boolean;
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  (
    {
      surface = "solid",
      glow = "none",
      interactive = false,
      padded = true,
      className,
      children,
      ...rest
    },
    ref,
  ) => (
    <motion.div
      ref={ref}
      className={cn(
        styles.card,
        styles[`card--${surface}`],
        glow !== "none" && styles[`card--glow-${glow}`],
        interactive && styles["card--interactive"],
        padded && styles["card--padded"],
        className,
      )}
      whileTap={interactive ? { scale: 0.985 } : undefined}
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
      {...rest}
    >
      {children}
    </motion.div>
  ),
);

Card.displayName = "Card";
