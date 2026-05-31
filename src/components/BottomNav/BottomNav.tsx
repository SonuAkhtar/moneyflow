"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { BOTTOM_NAV } from "@/constants";
import { cn } from "@/utils";
import styles from "./BottomNav.module.scss";

const SPRING = { type: "spring" as const, stiffness: 500, damping: 38, mass: 0.7 };

export const BottomNav = () => {
  const pathname = usePathname();

  return (
    <nav className={styles.nav}>
      <div className={styles.nav_bar}>
        {BOTTOM_NAV.map((item) => {
          const Icon = item.icon;
          const active =
            item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(styles.nav_item, active && styles["nav_item--active"])}
              aria-current={active ? "page" : undefined}
            >
              <span className={styles.nav_iconZone}>
                {active && (
                  <motion.span
                    layoutId="nav-active"
                    className={styles.nav_orb}
                    transition={SPRING}
                  />
                )}
                <motion.span
                  className={styles.nav_icon}
                  animate={{ y: active ? -12 : 0, scale: active ? 1.04 : 1 }}
                  whileTap={{ scale: 0.84 }}
                  transition={SPRING}
                >
                  <Icon size={22} strokeWidth={active ? 2.4 : 2} />
                </motion.span>
              </span>
              <span className={styles.nav_label}>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};
