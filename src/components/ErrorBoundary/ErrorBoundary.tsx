"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { Button } from "@/components/Button/Button";
import styles from "./ErrorBoundary.module.scss";

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  override state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  override componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("App error boundary caught:", error, info.componentStack);
  }

  private reset = () => {
    this.setState({ hasError: false });
  };

  private reload = () => {
    this.reset();
    if (typeof window !== "undefined") window.location.reload();
  };

  override render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className={styles.fallback}>
        <span className={styles.fallback_icon}>
          <AlertTriangle size={28} />
        </span>
        <h2 className={styles.fallback_title}>Something went wrong</h2>
        <p className={styles.fallback_text}>
          The app hit an unexpected error. Your data is safe - try reloading.
        </p>
        <Button icon={RotateCcw} onClick={this.reload}>
          Reload app
        </Button>
      </div>
    );
  }
}
