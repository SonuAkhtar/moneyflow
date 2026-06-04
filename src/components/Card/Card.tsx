"use client";

import { forwardRef } from "react";
import { m, type HTMLMotionProps } from "framer-motion";
import { cn } from "@/utils";
import styles from "./Card.module.scss";

interface CardProps extends Omit<HTMLMotionProps<"div">, "ref"> {
  surface?: "solid" | "glass" | "gradient";
  glow?: "lime" | "orange" | "none";
  elevation?: "flat" | "raised";
  interactive?: boolean;
  padded?: boolean;
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  (
    {
      surface = "solid",
      glow = "none",
      elevation = "flat",
      interactive = false,
      padded = true,
      className,
      children,
      ...rest
    },
    ref,
  ) => (
    <m.div
      ref={ref}
      className={cn(
        styles.card,
        styles[`card--${surface}`],
        glow !== "none" && styles[`card--glow-${glow}`],
        elevation === "raised" && styles["card--raised"],
        interactive && styles["card--interactive"],
        padded && styles["card--padded"],
        className,
      )}
      whileTap={interactive ? { scale: 0.985 } : undefined}
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
      {...rest}
    >
      {children}
    </m.div>
  ),
);

Card.displayName = "Card";
