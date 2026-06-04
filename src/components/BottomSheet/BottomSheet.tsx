"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { AnimatePresence, m } from "framer-motion";
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
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCloseRef.current();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = original;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <Portal>
      <AnimatePresence>
        {open && (
          <div key="sheet" className={styles.sheet}>
            <m.div
              className={styles.sheet_backdrop}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
            />
            <m.div
              className={styles.sheet_slide}
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ duration: 0.36, ease: [0.32, 0.72, 0, 1] }}
            >
              <m.div
                className={cn(styles.sheet_panel, className)}
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
              </m.div>
            </m.div>
          </div>
        )}
      </AnimatePresence>
    </Portal>
  );
};
