"use client";

import { useEffect, type ReactNode } from "react";
import { LazyMotion, MotionConfig } from "framer-motion";

const loadMotionFeatures = () =>
  import("framer-motion").then((mod) => mod.domMax);
import { Toaster } from "@/components/Toaster/Toaster";
import { ServiceWorker } from "@/components/ServiceWorker/ServiceWorker";
import { ErrorBoundary } from "@/components/ErrorBoundary/ErrorBoundary";
import { useThemeStore } from "@/store/themeStore";

export const Providers = ({ children }: { children: ReactNode }) => {
  useEffect(() => {
    useThemeStore.getState().syncFromDocument();
  }, []);

  return (
    <LazyMotion features={loadMotionFeatures} strict>
      <MotionConfig reducedMotion="user">
        <ErrorBoundary>{children}</ErrorBoundary>
        <Toaster />
        <ServiceWorker />
      </MotionConfig>
    </LazyMotion>
  );
};
