"use client";

import { useFinanceStore } from "@/store/financeStore";
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

  return (
    <div className={styles.greeting}>
      <p className={styles.greeting_hello}>
        {greetingFor(new Date().getHours())}, <span>{firstName}</span>
      </p>
      <span className={styles.greeting_date}>{dayLabel(new Date())}</span>
    </div>
  );
};
