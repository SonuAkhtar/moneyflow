import type { Metadata } from "next";
import type { ReactNode } from "react";
import { preload } from "react-dom";
import { AppLayout } from "@/layouts/AppLayout/AppLayout";

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default function AppGroupLayout({ children }: { children: ReactNode }) {
  preload("/icons/splash-logo.webp", { as: "image", fetchPriority: "high" });
  return <AppLayout>{children}</AppLayout>;
}
