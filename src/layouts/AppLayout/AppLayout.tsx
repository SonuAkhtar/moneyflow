"use client";

import { useEffect, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { AppHeader } from "@/components/AppHeader/AppHeader";
import { BottomNav } from "@/components/BottomNav/BottomNav";
import { SplashScreen } from "@/components/SplashScreen/SplashScreen";
import { QuickAddSheet } from "@/sections/QuickAddSheet/QuickAddSheet";
import { NotificationsDrawer } from "@/sections/NotificationsDrawer/NotificationsDrawer";
import { useAuthStore } from "@/store/authStore";
import { useFinanceStore } from "@/store/financeStore";
import { DEMO_USER } from "@/constants";
import styles from "./AppLayout.module.scss";

export const AppLayout = ({ children }: { children: ReactNode }) => {
  const pathname = usePathname();
  const hasHydrated = useAuthStore((s) => s.hasHydrated);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const bootstrap = useFinanceStore((s) => s.bootstrap);
  const profile = useFinanceStore((s) => s.profile);

  useEffect(() => {
    if (hasHydrated && !isAuthenticated) setUser(DEMO_USER);
  }, [hasHydrated, isAuthenticated, setUser]);

  useEffect(() => {
    if (isAuthenticated && user) bootstrap(user.id, user.fullName, user.email);
  }, [isAuthenticated, user, bootstrap]);

  if (!hasHydrated || !isAuthenticated || !profile) {
    return <SplashScreen />;
  }

  return (
    <div className={styles.shell}>
      <div className={styles.shell_glow} aria-hidden />
      <div className={styles.shell_inner}>
        <AppHeader />
        <motion.main
          key={pathname}
          className={styles.shell_main}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
        >
          {children}
        </motion.main>
      </div>
      <BottomNav />
      <QuickAddSheet />
      <NotificationsDrawer />
    </div>
  );
};
