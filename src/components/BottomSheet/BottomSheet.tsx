"use client";

import { useEffect, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { Portal } from "@/components/Portal/Portal";
import { cn } from "@/utils";
import styles from "./BottomSheet.module.scss";

interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  showHandle?: boolean;
  className?: string;
}

export const BottomSheet = ({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  showHandle = true,
  className,
}: BottomSheetProps) => {
  useEffect(() => {
    if (!open) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = original;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  return (
    <Portal>
      <AnimatePresence>
        {open && (
          <div className={styles.sheet}>
            <motion.div
              className={styles.sheet_backdrop}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
            />
            <motion.div
              className={cn(styles.sheet_panel, className)}
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ duration: 0.36, ease: [0.32, 0.72, 0, 1] }}
              drag="y"
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={{ top: 0, bottom: 0.4 }}
              onDragEnd={(_, info) => {
                if (info.offset.y > 120 || info.velocity.y > 700) onClose();
              }}
              role="dialog"
              aria-modal="true"
            >
              {showHandle && <span className={styles.sheet_handle} />}
              {(title || description) && (
                <header className={styles.sheet_header}>
                  <div>
                    {title && <h3 className={styles.sheet_title}>{title}</h3>}
                    {description && (
                      <p className={styles.sheet_desc}>{description}</p>
                    )}
                  </div>
                  <button
                    className={styles.sheet_close}
                    onClick={onClose}
                    aria-label="Close"
                  >
                    <X size={18} />
                  </button>
                </header>
              )}
              <div className={styles.sheet_body}>{children}</div>
              {footer && <div className={styles.sheet_footer}>{footer}</div>}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </Portal>
  );
};
