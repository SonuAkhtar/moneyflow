"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { BOTTOM_NAV, ROUTES } from "@/constants";
import { cn } from "@/utils";
import styles from "./BottomNav.module.scss";

const SPRING = { type: "spring" as const, stiffness: 460, damping: 36, mass: 0.8 };

export const BottomNav = () => {
  const pathname = usePathname();

  return (
    <nav className={styles.nav}>
      <div className={styles.nav_bar}>
        {BOTTOM_NAV.map((item) => {
          const Icon = item.icon;
          const active =
            item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);

          // Home is the centrepiece — a raised, glowing orb that stands out.
          if (item.href === ROUTES.home) {
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  styles.nav_home,
                  active && styles["nav_home--active"],
                )}
                aria-current={active ? "page" : undefined}
              >
                <motion.span
                  className={styles.nav_orb}
                  whileTap={{ scale: 0.9 }}
                  transition={SPRING}
                >
                  <Icon size={23} strokeWidth={2.4} />
                </motion.span>
                <span className={styles.nav_label}>{item.label}</span>
              </Link>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(styles.nav_item, active && styles["nav_item--active"])}
              aria-current={active ? "page" : undefined}
            >
              <span className={styles.nav_iconWrap}>
                <motion.span
                  className={styles.nav_icon}
                  whileTap={{ scale: 0.86 }}
                  transition={SPRING}
                >
                  <Icon size={21} strokeWidth={active ? 2.4 : 2} />
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
