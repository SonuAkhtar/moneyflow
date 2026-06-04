"use client";

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
}: ConfirmDialogProps) => (
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
            className={styles.dialog_panel}
            initial={{ opacity: 0, scale: 0.94, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ type: "spring", stiffness: 360, damping: 30 }}
            role="alertdialog"
            aria-modal="true"
          >
            <h3 className={styles.dialog_title}>{title}</h3>
            <p className={styles.dialog_message}>{message}</p>
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
