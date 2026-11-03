"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, m } from "framer-motion";
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from "lucide-react";
import { useUiStore } from "@/store/uiStore";
import { Portal } from "@/components/Portal/Portal";
import type { ToastMessage } from "@/types";
import styles from "./Toaster.module.scss";

const ICONS = {
  success: CheckCircle2,
  error: XCircle,
  info: Info,
  warning: AlertTriangle,
} as const;

const ToastItem = ({ toast }: { toast: ToastMessage }) => {
  const dismiss = useUiStore((s) => s.dismissToast);
  const Icon = ICONS[toast.variant];
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const paused = hovered || focused;

  useEffect(() => {
    if (paused) return;
    const duration = toast.duration ?? (toast.action ? 10000 : 3600);
    const timer = setTimeout(() => dismiss(toast.id), duration);
    return () => clearTimeout(timer);
  }, [paused, toast.id, toast.duration, toast.action, dismiss]);

  return (
    <m.div
      layout
      className={`${styles.toast} ${styles[`toast--${toast.variant}`]}`}
      initial={{ opacity: 0, y: -20, scale: 0.94 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -12, scale: 0.96 }}
      transition={{ type: "spring", stiffness: 380, damping: 30 }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
    >
      <span className={styles.toast_icon}>
        <Icon size={18} />
      </span>
      <div className={styles.toast_body}>
        <p className={styles.toast_title}>{toast.title}</p>
        {toast.description && (
          <p className={styles.toast_desc}>{toast.description}</p>
        )}
      </div>
      {toast.action && (
        <button
          type="button"
          className={styles.toast_action}
          onClick={() => {
            toast.action?.onClick();
            dismiss(toast.id);
          }}
        >
          {toast.action.label}
        </button>
      )}
      <button
        type="button"
        className={styles.toast_close}
        aria-label={`Dismiss: ${toast.title}`}
        onClick={() => dismiss(toast.id)}
      >
        <X size={16} />
      </button>
    </m.div>
  );
};

export const Toaster = () => {
  const toasts = useUiStore((s) => s.toasts);

  return (
    <Portal>
      <div className={styles.toaster} role="status" aria-label="Notifications">
        <AnimatePresence>
          {toasts.map((toast) => (
            <ToastItem key={toast.id} toast={toast} />
          ))}
        </AnimatePresence>
      </div>
    </Portal>
  );
};
