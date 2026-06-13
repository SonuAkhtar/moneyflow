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

// Reference-counted scroll lock so stacked sheets don't unlock the page when
// only one of them closes.
let scrollLockCount = 0;
let savedOverflow = "";
const lockScroll = () => {
  if (scrollLockCount === 0) {
    savedOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
  }
  scrollLockCount += 1;
};
const unlockScroll = () => {
  scrollLockCount = Math.max(0, scrollLockCount - 1);
  if (scrollLockCount === 0) document.body.style.overflow = savedOverflow;
};

// Stack of open sheets so only the topmost one reacts to Escape.
const escapeStack: Array<() => void> = [];

const FOCUSABLE =
  'a[href],button:not([disabled]),textarea,input:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])';

const getFocusable = (el: HTMLElement): HTMLElement[] =>
  Array.from(el.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
    (n) => n.offsetParent !== null,
  );

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
  const panelRef = useRef<HTMLDivElement>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) return;
    lockScroll();
    restoreFocusRef.current = document.activeElement as HTMLElement | null;

    const close = () => onCloseRef.current();
    escapeStack.push(close);

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (escapeStack[escapeStack.length - 1] === close) {
          e.stopPropagation();
          close();
        }
        return;
      }
      if (e.key !== "Tab") return;
      const panel = panelRef.current;
      if (!panel) return;
      const focusables = getFocusable(panel);
      if (focusables.length === 0) {
        e.preventDefault();
        panel.focus();
        return;
      }
      const first = focusables[0]!;
      const last = focusables[focusables.length - 1]!;
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", onKey);

    // Move focus into the sheet unless a child already grabbed it (autoFocus).
    const focusTimer = window.setTimeout(() => {
      const panel = panelRef.current;
      if (panel && !panel.contains(document.activeElement)) {
        (getFocusable(panel)[0] ?? panel).focus();
      }
    }, 0);

    return () => {
      window.removeEventListener("keydown", onKey);
      window.clearTimeout(focusTimer);
      const idx = escapeStack.lastIndexOf(close);
      if (idx !== -1) escapeStack.splice(idx, 1);
      unlockScroll();
      restoreFocusRef.current?.focus?.();
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
                ref={panelRef}
                tabIndex={-1}
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
