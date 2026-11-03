"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { m } from "framer-motion";
import { BOTTOM_NAV, ROUTES } from "@/constants";
import { cn } from "@/utils";
import styles from "./BottomNav.module.scss";

const SPRING = {
  type: "spring" as const,
  stiffness: 460,
  damping: 36,
  mass: 0.8,
};

export const BottomNav = () => {
  const pathname = usePathname();
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    let last = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY;
      if (Math.abs(y - last) < 8) return;
      setHidden(y > last && y > 80);
      last = y;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <nav className={cn(styles.nav, hidden && styles["nav--hidden"])}>
      <div className={styles.nav_bar}>
        {BOTTOM_NAV.map((item) => {
          const Icon = item.icon;
          const active =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);

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
                <m.span
                  className={styles.nav_orb}
                  whileTap={{ scale: 0.9 }}
                  transition={SPRING}
                >
                  <Icon size={23} strokeWidth={2.4} />
                </m.span>
                <span className={styles.nav_label}>{item.label}</span>
              </Link>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                styles.nav_item,
                active && styles["nav_item--active"],
              )}
              aria-current={active ? "page" : undefined}
            >
              <span className={styles.nav_iconWrap}>
                <m.span
                  className={styles.nav_icon}
                  whileTap={{ scale: 0.86 }}
                  transition={SPRING}
                >
                  <Icon size={21} strokeWidth={active ? 2.4 : 2} />
                </m.span>
              </span>
              <span className={styles.nav_label}>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};
