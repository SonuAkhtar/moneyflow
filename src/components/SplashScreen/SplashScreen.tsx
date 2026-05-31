"use client";

import { motion } from "framer-motion";
import styles from "./SplashScreen.module.scss";

export const SplashScreen = () => (
  <div className={styles.splash}>
    <span className={styles.splash_aura} aria-hidden />
    <motion.img
      src="/icons/moneyflow-logo-full.png"
      alt="moneyFlow"
      width={200}
      height={200}
      className={styles.splash_logo}
      initial={{ scale: 0.86, opacity: 0, y: 6 }}
      animate={{ scale: 1, opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 260, damping: 18 }}
    />
    <span className={styles.splash_bar} aria-hidden>
      <span className={styles.splash_barFill} />
    </span>
  </div>
);
