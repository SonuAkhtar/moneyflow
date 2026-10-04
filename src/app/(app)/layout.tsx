import type { Metadata } from "next";
import type { ReactNode } from "react";
import { AppLayout } from "@/layouts/AppLayout/AppLayout";

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default function AppGroupLayout({ children }: { children: ReactNode }) {
  return <AppLayout>{children}</AppLayout>;
}
