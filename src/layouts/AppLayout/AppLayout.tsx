"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { m } from "framer-motion";
import type { User } from "@supabase/supabase-js";
import { AppHeader } from "@/components/AppHeader/AppHeader";
import { BottomNav } from "@/components/BottomNav/BottomNav";
import { PullToRefresh } from "@/components/PullToRefresh/PullToRefresh";
import { SplashScreen } from "@/components/SplashScreen/SplashScreen";
import { getBrowserSupabase } from "@/lib/supabase/client";
import { useAuthStore, type SessionUser } from "@/store/authStore";
import { useFinanceStore } from "@/store/financeStore";
import { ROUTES } from "@/constants";
import styles from "./AppLayout.module.scss";

const toSessionUser = (u: User): SessionUser => ({
  id: u.id,
  email: u.email ?? "",
  fullName: (u.user_metadata?.full_name as string) ?? "",
  username: (u.user_metadata?.username as string) ?? null,
});

export const AppLayout = ({ children }: { children: ReactNode }) => {
  const router = useRouter();
  const pathname = usePathname();
  const status = useAuthStore((s) => s.status);
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const hydrate = useFinanceStore((s) => s.hydrate);
  const resetAll = useFinanceStore((s) => s.resetAll);
  const profile = useFinanceStore((s) => s.profile);
  const hasHydrated = useFinanceStore((s) => s.hasHydrated);
  const hydratedFor = useRef<string | null>(null);
  const [rehydrated, setRehydrated] = useState(false);

  useEffect(() => {
    let active = true;
    const supabase = getBrowserSupabase();
    if (!supabase) {
      setUser(null);
      return;
    }
    const apply = (u: User | null) => {
      if (!active) return;
      setUser(u ? toSessionUser(u) : null);
    };
    supabase.auth
      .getSession()
      .then(({ data }) => apply(data.session?.user ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (!active) return;
      if (event === "SIGNED_OUT") {
        hydratedFor.current = null;
        resetAll();
        setUser(null);
        return;
      }
      apply(session?.user ?? null);
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, [setUser, resetAll]);

  useEffect(() => {
    let active = true;
    void Promise.resolve(useFinanceStore.persist.rehydrate()).finally(() => {
      if (active) setRehydrated(true);
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!rehydrated) return;
    if (status === "authed" && user && hydratedFor.current !== user.id) {
      hydratedFor.current = user.id;
      const cached = useFinanceStore.getState().profile;
      if (cached && cached.id !== user.id) resetAll();
      void hydrate(user.id);
    }
  }, [rehydrated, status, user, hydrate, resetAll]);

  useEffect(() => {
    if (status === "anon") router.replace(ROUTES.login);
  }, [status, router]);

  if (status === "anon" || !profile || !hasHydrated) {
    return <SplashScreen />;
  }

  return (
    <div className={styles.shell}>
      <div className={styles.shell_glow} aria-hidden />
      <div className={styles.shell_inner}>
        <AppHeader />
        <PullToRefresh onRefresh={() => hydrate(profile.id)}>
          <m.main
            key={pathname}
            className={styles.shell_main}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
          >
            {children}
          </m.main>
        </PullToRefresh>
      </div>
      <BottomNav />
    </div>
  );
};
