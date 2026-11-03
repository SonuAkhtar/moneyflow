"use client";

import { Eye, EyeOff } from "lucide-react";
import { useFinanceStore } from "@/store/financeStore";
import { useUiStore } from "@/store/uiStore";
import { dayLabel } from "@/utils";
import styles from "./GreetingHeader.module.scss";

const greetingFor = (hour: number): string => {
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
};

export const GreetingHeader = () => {
  const profile = useFinanceStore((s) => s.profile);
  const firstName = profile?.fullName?.split(" ")[0] ?? "there";
  const amountsHidden = useUiStore((s) => s.amountsHidden);
  const toggleAmounts = useUiStore((s) => s.toggleAmounts);

  return (
    <div className={styles.greeting}>
      <p className={styles.greeting_hello}>
        {greetingFor(new Date().getHours())}, <span>{firstName}</span>
      </p>
      <span className={styles.greeting_side}>
        <span className={styles.greeting_date}>{dayLabel(new Date())}</span>
        <button
          type="button"
          className={styles.greeting_eye}
          aria-label={
            amountsHidden ? "Show monthly amounts" : "Hide monthly amounts"
          }
          aria-pressed={!amountsHidden}
          onClick={toggleAmounts}
        >
          {amountsHidden ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </span>
    </div>
  );
};
