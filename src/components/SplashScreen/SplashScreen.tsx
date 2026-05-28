"use client";

import { motion } from "framer-motion";
import { Wallet } from "lucide-react";
import styles from "./SplashScreen.module.scss";

export const SplashScreen = ({ label = "moneyFlow" }: { label?: string }) => (
  <div className={styles.splash}>
    <motion.div
      className={styles.splash_mark}
      initial={{ scale: 0.7, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", stiffness: 280, damping: 20 }}
    >
      <Wallet size={32} strokeWidth={2.4} />
    </motion.div>
    <motion.span
      className={styles.splash_label}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
    >
      {label}
    </motion.span>
    <span className={styles.splash_loader} />
  </div>
);
