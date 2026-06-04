"use client";

import { AnimatePresence, m } from "framer-motion";
import { Moon, Sun } from "lucide-react";
import { useThemeStore } from "@/store/themeStore";
import { cn } from "@/utils";
import styles from "./ThemeToggle.module.scss";

export const ThemeToggle = () => {
  const theme = useThemeStore((s) => s.theme);
  const toggleTheme = useThemeStore((s) => s.toggleTheme);
  const isDark = theme === "dark";

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isDark}
      aria-label="Toggle dark mode"
      className={cn(styles.toggle, isDark && styles["toggle--dark"])}
      onClick={toggleTheme}
    >
      <m.span
        className={styles.toggle_knob}
        animate={{ x: isDark ? 28 : 0 }}
        transition={{ type: "spring", stiffness: 520, damping: 34 }}
      >
        <AnimatePresence mode="wait" initial={false}>
          <m.span
            key={theme}
            initial={{ rotate: -90, opacity: 0 }}
            animate={{ rotate: 0, opacity: 1 }}
            exit={{ rotate: 90, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className={styles.toggle_iconWrap}
          >
            {isDark ? <Moon size={14} /> : <Sun size={14} />}
          </m.span>
        </AnimatePresence>
      </m.span>
    </button>
  );
};
