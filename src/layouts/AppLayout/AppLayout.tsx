"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { AppHeader } from "@/components/AppHeader/AppHeader";
import { BottomNav } from "@/components/BottomNav/BottomNav";
import { PullToRefresh } from "@/components/PullToRefresh/PullToRefresh";
import { SplashScreen } from "@/components/SplashScreen/SplashScreen";
import { Button } from "@/components/Button/Button";
import { getBrowserSupabase } from "@/lib/supabase/client";
import { useAuthStore, type SessionUser } from "@/store/authStore";
import { useFinanceStore } from "@/store/financeStore";
import { useSignOut } from "@/hooks/useSignOut";
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
  const flushSync = useFinanceStore((s) => s.flushSync);
  const resetAll = useFinanceStore((s) => s.resetAll);
  const profile = useFinanceStore((s) => s.profile);
  const hasHydrated = useFinanceStore((s) => s.hasHydrated);
  const initialized = useFinanceStore((s) => s.initialized);
  const loadError = useFinanceStore((s) => s.loadError);
  const [retrying, setRetrying] = useState(false);
  const signOut = useSignOut();
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

  const ownedProfile =
    profile && user && profile.id === user.id ? profile : null;
  const needsOnboarding = Boolean(
    initialized && ownedProfile && !ownedProfile.onboardingComplete,
  );

  useEffect(() => {
    if (needsOnboarding) router.replace(ROUTES.onboarding);
  }, [needsOnboarding, router]);

  useEffect(() => {
    if (status !== "authed" || !hasHydrated) return;
    const warm = () => {
      void import("@/components/charts");
    };
    const ric = (
      window as unknown as {
        requestIdleCallback?: (
          cb: () => void,
          opts?: { timeout: number },
        ) => number;
        cancelIdleCallback?: (id: number) => void;
      }
    ).requestIdleCallback;
    const cic = (
      window as unknown as { cancelIdleCallback?: (id: number) => void }
    ).cancelIdleCallback;
    const id = ric
      ? ric(warm, { timeout: 3000 })
      : window.setTimeout(warm, 1500);
    return () => {
      if (ric && cic) cic(id);
      else clearTimeout(id);
    };
  }, [status, hasHydrated]);

  const ownedProfileMissing = !profile || !user || profile.id !== user.id;
  const loadFailed =
    status === "authed" && user && loadError && ownedProfileMissing;
  const accountMissing = status === "authed" && user && initialized && !profile;

  if (loadFailed || accountMissing) {
    const retry = async () => {
      if (!user) return;
      setRetrying(true);
      await hydrate(user.id);
      setRetrying(false);
    };
    return (
      <div
        style={{
          minHeight: "100dvh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "16px",
          padding: "24px",
          textAlign: "center",
        }}
      >
        <p style={{ color: "var(--text-secondary)", maxWidth: "280px" }}>
          {loadFailed
            ? "We couldn't load your data. Check your connection and try again."
            : "We couldn't load your account. Please sign in again."}
        </p>
        {loadFailed && (
          <Button size="md" loading={retrying} onClick={() => void retry()}>
            Try again
          </Button>
        )}
        <Button
          size="md"
          variant={loadFailed ? "secondary" : "primary"}
          onClick={() => void signOut()}
        >
          Sign out
        </Button>
      </div>
    );
  }

  if (status !== "authed" || !ownedProfile || !hasHydrated || needsOnboarding) {
    return <SplashScreen />;
  }

  const routeKey = pathname.startsWith("/savings")
    ? "savings"
    : pathname.startsWith("/analytics")
      ? "analytics"
      : pathname.startsWith("/emi")
        ? "emi"
        : pathname.startsWith("/profile")
          ? "profile"
          : "home";

  const routeTitle = {
    home: "Home",
    savings: "Savings",
    analytics: "Analytics",
    emi: "EMIs and borrowings",
    profile: "Profile",
  }[routeKey];

  return (
    <div className={styles.shell} data-route={routeKey}>
      <div className={styles.shell_canvas} aria-hidden />
      <div className={styles.shell_inner}>
        <AppHeader />
        <PullToRefresh
          onRefresh={() => flushSync().then(() => hydrate(ownedProfile.id))}
        >
          <main className={styles.shell_main}>
            <h1 className="sr-only">{routeTitle}</h1>
            {children}
          </main>
        </PullToRefresh>
      </div>
      <BottomNav />
    </div>
  );
};
