"use client";

import { useEffect, type ReactNode } from "react";
import { LazyMotion, MotionConfig } from "framer-motion";

const loadMotionFeatures = () =>
  import("framer-motion").then((mod) => mod.domMax);
import { Toaster } from "@/components/Toaster/Toaster";
import { ServiceWorker } from "@/components/ServiceWorker/ServiceWorker";
import { ErrorBoundary } from "@/components/ErrorBoundary/ErrorBoundary";
import { NavigationProgress } from "@/components/NavigationProgress/NavigationProgress";
import { useThemeStore } from "@/store/themeStore";

export const Providers = ({ children }: { children: ReactNode }) => {
  useEffect(() => {
    const sync = () => useThemeStore.getState().syncFromDocument();
    sync();
    const observer = new MutationObserver(sync);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });
    return () => observer.disconnect();
  }, []);

  return (
    <LazyMotion features={loadMotionFeatures} strict>
      <MotionConfig reducedMotion="user">
        <NavigationProgress />
        <ErrorBoundary>{children}</ErrorBoundary>
        <Toaster />
        <ServiceWorker />
      </MotionConfig>
    </LazyMotion>
  );
};
