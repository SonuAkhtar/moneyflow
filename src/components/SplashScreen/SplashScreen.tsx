"use client";

import { motion } from "framer-motion";
import { Wallet } from "lucide-react";
import styles from "./SplashScreen.module.scss";

export const SplashScreen = ({ label = "moneyFlow" }: { label?: string }) => (
  <div className={styles.splash}>
    <span className={styles.splash_aura} aria-hidden />
    <motion.div
      className={styles.splash_mark}
      initial={{ scale: 0.8, opacity: 0, y: 6 }}
      animate={{ scale: 1, opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 260, damping: 18 }}
    >
      <span className={styles.splash_ring} aria-hidden />
      <Wallet size={30} strokeWidth={2.4} />
    </motion.div>
    <motion.span
      className={styles.splash_label}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.12, duration: 0.4 }}
    >
      {label}
    </motion.span>
    <motion.span
      className={styles.splash_tagline}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.22, duration: 0.4 }}
    >
      Money in motion
    </motion.span>
    <span className={styles.splash_bar} aria-hidden>
      <span className={styles.splash_barFill} />
    </span>
  </div>
);
