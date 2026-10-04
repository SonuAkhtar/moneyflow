"use client";

import { CloudOff, RefreshCw } from "lucide-react";
import { useFinanceStore } from "@/store/financeStore";
import { cn } from "@/utils";
import styles from "./SyncBadge.module.scss";

export const SyncBadge = () => {
  const pending = useFinanceStore((s) => s.pendingSync);
  const status = useFinanceStore((s) => s.syncStatus);
  const retrySync = useFinanceStore((s) => s.retrySync);

  if (pending === 0) return null;
  const offline = status === "offline";
  const label = `${pending} change${pending === 1 ? "" : "s"} waiting to sync`;

  return (
    <button
      type="button"
      className={cn(styles.badge, offline && styles["badge--offline"])}
      onClick={retrySync}
      aria-label={offline ? `${label}. Tap to retry` : label}
      title={offline ? "Offline - tap to retry" : "Syncing"}
    >
      {offline ? (
        <CloudOff size={14} aria-hidden />
      ) : (
        <RefreshCw size={14} className={styles.spin} aria-hidden />
      )}
      <span aria-live="polite">{pending}</span>
    </button>
  );
};
