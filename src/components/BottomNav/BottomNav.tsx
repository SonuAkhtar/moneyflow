"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { BOTTOM_NAV } from "@/constants";
import { useUiStore } from "@/store/uiStore";
import { cn } from "@/utils";
import styles from "./BottomNav.module.scss";

export const BottomNav = () => {
  const pathname = usePathname();
  const openQuickAdd = useUiStore((s) => s.openQuickAdd);

  return (
    <nav className={styles.nav}>
      <div className={styles.nav_bar}>
        {BOTTOM_NAV.map((item) => {
          const Icon = item.icon;

          if (item.isAction) {
            return (
              <motion.button
                key={item.href}
                type="button"
                className={styles.nav_action}
                onClick={openQuickAdd}
                whileTap={{ scale: 0.9 }}
                transition={{ type: "spring", stiffness: 500, damping: 28 }}
                aria-label="Add transaction"
              >
                <Icon size={24} strokeWidth={2.4} />
              </motion.button>
            );
          }

          const active =
            item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(styles.nav_item, active && styles["nav_item--active"])}
            >
              <span className={styles.nav_iconWrap}>
                {active && (
                  <motion.span
                    layoutId="nav-active"
                    className={styles.nav_glow}
                    transition={{ type: "spring", stiffness: 420, damping: 32 }}
                  />
                )}
                <Icon size={22} strokeWidth={active ? 2.4 : 2} />
              </span>
              <span className={styles.nav_label}>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};
