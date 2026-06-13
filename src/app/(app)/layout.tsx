import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { AppLayout } from "@/layouts/AppLayout/AppLayout";
import { getServerSupabase } from "@/lib/supabase/server";
import { ROUTES } from "@/constants";

export default async function AppGroupLayout({
  children,
}: {
  children: ReactNode;
}) {
  const supabase = await getServerSupabase();
  if (supabase) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) redirect(ROUTES.login);
  }

  return <AppLayout>{children}</AppLayout>;
}
