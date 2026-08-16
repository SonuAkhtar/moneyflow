"use client";

import { useEffect } from "react";
import { AnimatePresence, m } from "framer-motion";
import { AlertTriangle, CheckCircle2, Info, XCircle } from "lucide-react";
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

  useEffect(() => {
    const timer = setTimeout(() => dismiss(toast.id), toast.duration ?? 3600);
    return () => clearTimeout(timer);
  }, [toast.id, toast.duration, dismiss]);

  return (
    <m.div
      layout
      className={`${styles.toast} ${styles[`toast--${toast.variant}`]}`}
      initial={{ opacity: 0, y: -20, scale: 0.94 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -12, scale: 0.96 }}
      transition={{ type: "spring", stiffness: 380, damping: 30 }}
      role={toast.variant === "error" ? "alert" : "status"}
      tabIndex={0}
      aria-label="Dismiss notification"
      onClick={() => dismiss(toast.id)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          dismiss(toast.id);
        }
      }}
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
    </m.div>
  );
};

export const Toaster = () => {
  const toasts = useUiStore((s) => s.toasts);

  return (
    <Portal>
      <div
        className={styles.toaster}
        role="region"
        aria-label="Notifications"
        aria-live="polite"
      >
        <AnimatePresence>
          {toasts.map((toast) => (
            <ToastItem key={toast.id} toast={toast} />
          ))}
        </AnimatePresence>
      </div>
    </Portal>
  );
};
