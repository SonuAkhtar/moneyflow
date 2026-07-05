import type { ReactNode } from "react";
import { AppLayout } from "@/layouts/AppLayout/AppLayout";

export default function AppGroupLayout({ children }: { children: ReactNode }) {
  return <AppLayout>{children}</AppLayout>;
}
