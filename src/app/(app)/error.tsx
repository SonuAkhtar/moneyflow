"use client";

import { useEffect } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { Button } from "@/components/Button/Button";
import styles from "@/components/ErrorBoundary/ErrorBoundary.module.scss";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("App route error:", error);
  }, [error]);

  return (
    <div className={styles.fallback}>
      <span className={styles.fallback_icon}>
        <AlertTriangle size={28} />
      </span>
      <h2 className={styles.fallback_title}>Something went wrong</h2>
      <p className={styles.fallback_text}>
        This view hit an unexpected error. Your data is safe - try again.
      </p>
      <Button icon={RotateCcw} onClick={reset}>
        Try again
      </Button>
    </div>
  );
}
