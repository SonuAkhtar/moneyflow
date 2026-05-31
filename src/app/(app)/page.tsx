"use client";

import { motion } from "framer-motion";
import { GreetingHeader } from "@/sections/GreetingHeader/GreetingHeader";
import { MonthOverview } from "@/sections/MonthOverview/MonthOverview";
import { FinancialHealth } from "@/sections/FinancialHealth/FinancialHealth";
import { ComingUp } from "@/sections/ComingUp/ComingUp";
import { SavingsAccordion } from "@/sections/SavingsAccordion/SavingsAccordion";
import { MajorSpends } from "@/sections/MajorSpends/MajorSpends";
import { DailySpends } from "@/sections/DailySpends/DailySpends";
import { staggerContainer, listItem } from "@/themes/animations";
import styles from "./page.module.scss";

export default function HomePage() {
  return (
    <motion.div
      className={styles.page}
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
    >
      <motion.div variants={listItem}>
        <GreetingHeader />
      </motion.div>

      <motion.div variants={listItem}>
        <MonthOverview />
      </motion.div>

      <motion.div variants={listItem}>
        <FinancialHealth />
      </motion.div>

      <motion.div variants={listItem}>
        <ComingUp />
      </motion.div>

      <motion.div variants={listItem}>
        <SavingsAccordion />
      </motion.div>

      <motion.div variants={listItem}>
        <MajorSpends />
      </motion.div>

      <motion.div variants={listItem}>
        <DailySpends />
      </motion.div>
    </motion.div>
  );
}
