"use client";

import { useEffect, useState } from "react";
import { cn } from "@/utils";
import styles from "./RollingNumber.module.scss";

const DIGITS = "0123456789".split("");

interface RollingNumberProps {
  value: string;
  className?: string;
}

export const RollingNumber = ({ value, className }: RollingNumberProps) => {
  const [rolled, setRolled] = useState(false);

  useEffect(() => {
    const id = requestAnimationFrame(() =>
      requestAnimationFrame(() => setRolled(true)),
    );
    return () => cancelAnimationFrame(id);
  }, []);

  const chars = Array.from(value);
  return (
    <span className={cn(styles.roll, className)}>
      <span className="sr-only">{value}</span>
      {chars.map((ch, i) => {
        const key = chars.length - i;
        if (!/\d/.test(ch))
          return (
            <span key={key} aria-hidden>
              {ch}
            </span>
          );
        return (
          <span key={key} className={styles.digit} aria-hidden>
            <span
              className={styles.strip}
              style={{
                transform: `translateY(-${rolled ? Number(ch) * 10 : 0}%)`,
                transitionDelay: `${i * 45}ms`,
              }}
            >
              {DIGITS.map((d) => (
                <span key={d}>{d}</span>
              ))}
            </span>
          </span>
        );
      })}
    </span>
  );
};
