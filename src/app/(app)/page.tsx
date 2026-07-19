"use client";

import { m } from "framer-motion";
import { GreetingHeader } from "@/sections/GreetingHeader/GreetingHeader";
import { MonthOverview } from "@/sections/MonthOverview/MonthOverview";
import { ComingUp } from "@/sections/ComingUp/ComingUp";
import { SavingsAccordion } from "@/sections/SavingsAccordion/SavingsAccordion";
import { MajorSpends } from "@/sections/MajorSpends/MajorSpends";
import { DailySpends } from "@/sections/DailySpends/DailySpends";
import { BalanceTrailProvider } from "@/hooks/useBalanceTrail";
import { staggerContainer, listItem } from "@/themes/animations";
import styles from "./page.module.scss";

const cardTap = {
  whileTap: { scale: 0.97 },
  transition: { type: "spring" as const, stiffness: 500, damping: 18 },
};

export default function HomePage() {
  return (
    <BalanceTrailProvider>
      <m.div
        className={styles.page}
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
      >
        <m.div variants={listItem}>
          <GreetingHeader />
        </m.div>

        <m.div variants={listItem} {...cardTap}>
          <MonthOverview />
        </m.div>

        <m.div variants={listItem} {...cardTap}>
          <ComingUp />
        </m.div>

        <m.div variants={listItem} {...cardTap}>
          <SavingsAccordion />
        </m.div>

        <m.div variants={listItem}>
          <MajorSpends />
        </m.div>

        <m.div variants={listItem}>
          <DailySpends />
        </m.div>
      </m.div>
    </BalanceTrailProvider>
  );
}
