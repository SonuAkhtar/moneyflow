"use client";

import { useEffect, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { m } from "framer-motion";
import { ShieldCheck, Wallet } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { ROUTES, APP } from "@/constants";
import styles from "./AuthLayout.module.scss";

interface AuthLayoutProps {
  children: ReactNode;
  title: string;
  subtitle?: string;
}

export const AuthLayout = ({ children, title, subtitle }: AuthLayoutProps) => {
  const router = useRouter();
  const pathname = usePathname();
  const status = useAuthStore((s) => s.status);

  const isRecovery =
    pathname.startsWith(ROUTES.resetPassword) || pathname.startsWith(ROUTES.verify);

  useEffect(() => {
    if (status === "authed" && !isRecovery) router.replace(ROUTES.home);
  }, [status, isRecovery, router]);

  return (
    <div className={styles.auth}>
      <div className={styles.auth_bg} aria-hidden />
      <div className={styles.auth_inner}>
        <m.div
          className={styles.auth_hero}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        >
          <span className={styles.auth_mark}>
            <Wallet size={24} strokeWidth={2.4} />
          </span>
          <span className={styles.auth_brand}>{APP.name}</span>
          <h1 className={styles.auth_title}>{title}</h1>
          {subtitle && <p className={styles.auth_subtitle}>{subtitle}</p>}
        </m.div>

        <m.div
          className={styles.auth_panel}
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
        >
          {children}
          <div className={styles.auth_trust}>
            <ShieldCheck size={13} />
            Bank-grade encryption · Private by default
          </div>
        </m.div>
      </div>
    </div>
  );
};
