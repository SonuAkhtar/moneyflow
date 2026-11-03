"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
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

let scrollLockCount = 0;
let savedOverflow = "";
export const lockScroll = () => {
  if (scrollLockCount === 0) {
    savedOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
  }
  scrollLockCount += 1;
};
export const unlockScroll = () => {
  scrollLockCount = Math.max(0, scrollLockCount - 1);
  if (scrollLockCount === 0) document.body.style.overflow = savedOverflow;
};

let keyboardProxy: HTMLInputElement | null = null;
let primedFrom: HTMLElement | null = null;

export const primeKeyboard = () => {
  if (!window.matchMedia("(pointer: coarse)").matches) return;
  keyboardProxy?.remove();
  primedFrom = document.activeElement as HTMLElement | null;
  const input = document.createElement("input");
  input.setAttribute("aria-hidden", "true");
  input.tabIndex = -1;
  input.style.cssText =
    "position:fixed;top:0;left:0;width:1px;height:1px;opacity:0;font-size:16px;";
  document.body.appendChild(input);
  input.focus({ preventScroll: true });
  keyboardProxy = input;
  window.setTimeout(() => {
    input.remove();
    if (keyboardProxy === input) keyboardProxy = null;
  }, 1000);
};

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
  const titleId = useId();
  const descId = useId();
  const onCloseRef = useRef(onClose);
  const panelRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const settledRef = useRef(false);

  const [wasOpen, setWasOpen] = useState(false);
  const [opener, setOpener] = useState<HTMLElement | null>(null);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open && typeof document !== "undefined") {
      const active = document.activeElement as HTMLElement | null;
      setOpener(active && active === keyboardProxy ? primedFrom : active);
    }
  }

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) return;
    settledRef.current = false;
    lockScroll();

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
      if (opener?.isConnected) opener.focus();
    };
  }, [open, opener]);

  return (
    <Portal>
      <div inert={!open}>
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
                onAnimationComplete={() => {
                  if (settledRef.current) return;
                  settledRef.current = true;
                  bodyRef.current?.scrollTo({ top: 0 });
                }}
              >
                <m.div
                  ref={panelRef}
                  tabIndex={-1}
                  className={cn(styles.sheet_panel, className)}
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby={title ? titleId : undefined}
                  aria-describedby={description ? descId : undefined}
                  onFocus={(e) => {
                    if (
                      settledRef.current &&
                      e.target.matches("input, textarea, select")
                    ) {
                      e.target.scrollIntoView({ block: "nearest" });
                    }
                  }}
                >
                  {showHandle && <span className={styles.sheet_handle} />}
                  {(title || description) && (
                    <header className={styles.sheet_header}>
                      <div>
                        {title && (
                          <h3 id={titleId} className={styles.sheet_title}>
                            {title}
                          </h3>
                        )}
                        {description && (
                          <p id={descId} className={styles.sheet_desc}>
                            {description}
                          </p>
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
                  <div ref={bodyRef} className={styles.sheet_body}>
                    {children}
                  </div>
                  {footer && (
                    <div className={styles.sheet_footer}>{footer}</div>
                  )}
                </m.div>
              </m.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </Portal>
  );
};
