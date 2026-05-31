"use client";

import { useEffect, type ReactNode } from "react";
import { MotionConfig } from "framer-motion";
import { Toaster } from "@/components/Toaster/Toaster";
import { ServiceWorker } from "@/components/ServiceWorker/ServiceWorker";
import { ErrorBoundary } from "@/components/ErrorBoundary/ErrorBoundary";
import { useThemeStore } from "@/store/themeStore";

export const Providers = ({ children }: { children: ReactNode }) => {
  const syncFromDocument = useThemeStore((s) => s.syncFromDocument);

  useEffect(() => {
    syncFromDocument();
  }, [syncFromDocument]);

  return (
    <MotionConfig reducedMotion="user">
      <ErrorBoundary>{children}</ErrorBoundary>
      <Toaster />
      <ServiceWorker />
    </MotionConfig>
  );
};
