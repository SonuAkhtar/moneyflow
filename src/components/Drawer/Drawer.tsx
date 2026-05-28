"use client";

import { useEffect, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { Portal } from "@/components/Portal/Portal";
import { cn } from "@/utils";
import styles from "./Drawer.module.scss";

interface DrawerProps {
  open: boolean;
  onClose: () => void;
  side?: "left" | "right";
  title?: string;
  children: ReactNode;
  className?: string;
}

export const Drawer = ({
  open,
  onClose,
  side = "right",
  title,
  children,
  className,
}: DrawerProps) => {
  useEffect(() => {
    if (!open) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original;
    };
  }, [open]);

  const offset = side === "right" ? "100%" : "-100%";

  return (
    <Portal>
      <AnimatePresence>
        {open && (
          <div className={cn(styles.drawer, styles[`drawer--${side}`])}>
            <motion.div
              className={styles.drawer_backdrop}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
            />
            <motion.aside
              className={cn(styles.drawer_panel, className)}
              initial={{ x: offset }}
              animate={{ x: 0 }}
              exit={{ x: offset }}
              transition={{ type: "spring", stiffness: 340, damping: 34 }}
            >
              <header className={styles.drawer_header}>
                {title && <h3 className={styles.drawer_title}>{title}</h3>}
                <button
                  className={styles.drawer_close}
                  onClick={onClose}
                  aria-label="Close"
                >
                  <X size={18} />
                </button>
              </header>
              <div className={styles.drawer_body}>{children}</div>
            </motion.aside>
          </div>
        )}
      </AnimatePresence>
    </Portal>
  );
};
