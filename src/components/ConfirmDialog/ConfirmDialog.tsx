"use client";

import { useEffect, useId, useRef } from "react";
import { AnimatePresence, m } from "framer-motion";
import { Portal } from "@/components/Portal/Portal";
import { Button } from "@/components/Button/Button";
import type { Variant } from "@/types";
import styles from "./ConfirmDialog.module.scss";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmVariant?: Variant;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmDialog = ({
  open,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  confirmVariant = "danger",
  onConfirm,
  onCancel,
}: ConfirmDialogProps) => {
  const titleId = useId();
  const messageId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const onCancelRef = useRef(onCancel);
  useEffect(() => {
    onCancelRef.current = onCancel;
  });

  useEffect(() => {
    if (!open) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const { body } = document;
    const prevOverflow = body.style.overflow;
    body.style.overflow = "hidden";

    const focusables = () =>
      panelRef.current?.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );

    const focusTimer = window.setTimeout(() => focusables()?.[0]?.focus(), 0);

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onCancelRef.current();
        return;
      }
      if (e.key === "Tab") {
        const nodes = focusables();
        if (!nodes || nodes.length === 0) return;
        const first = nodes[0];
        const last = nodes[nodes.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      window.clearTimeout(focusTimer);
      body.style.overflow = prevOverflow;
      previouslyFocused?.focus?.();
    };
  }, [open]);

  return (
    <Portal>
      <AnimatePresence>
        {open && (
          <div key="dialog" className={styles.dialog}>
            <m.div
              className={styles.dialog_backdrop}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onCancel}
            />
            <m.div
              ref={panelRef}
              className={styles.dialog_panel}
              initial={{ opacity: 0, scale: 0.94, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 8 }}
              transition={{ type: "spring", stiffness: 360, damping: 30 }}
              role="alertdialog"
              aria-modal="true"
              aria-labelledby={titleId}
              aria-describedby={messageId}
            >
              <h3 id={titleId} className={styles.dialog_title}>
                {title}
              </h3>
              <p id={messageId} className={styles.dialog_message}>
                {message}
              </p>
              <div className={styles.dialog_actions}>
                <Button variant="secondary" fullWidth onClick={onCancel}>
                  {cancelLabel}
                </Button>
                <Button variant={confirmVariant} fullWidth onClick={onConfirm}>
                  {confirmLabel}
                </Button>
              </div>
            </m.div>
          </div>
        )}
      </AnimatePresence>
    </Portal>
  );
};
