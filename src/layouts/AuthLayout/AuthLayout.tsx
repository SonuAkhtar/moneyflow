"use client";

import { useEffect, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { motion } from "framer-motion";
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

  // Bounce signed-in users away from auth pages — except the recovery/verify
  // pages, which a user reaches while holding a (recovery) session.
  const isRecovery =
    pathname.startsWith(ROUTES.resetPassword) || pathname.startsWith(ROUTES.verify);

  useEffect(() => {
    if (status === "authed" && !isRecovery) router.replace(ROUTES.home);
  }, [status, isRecovery, router]);

  return (
    <div className={styles.auth}>
      <div className={styles.auth_glow} aria-hidden />
      <motion.div
        className={styles.auth_card}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className={styles.auth_brand}>
          <span className={styles.auth_mark}>
            <Wallet size={22} strokeWidth={2.4} />
          </span>
          <span className={styles.auth_brandText}>
            <span className={styles.auth_brandName}>{APP.name}</span>
            <span className={styles.auth_tagline}>{APP.tagline}</span>
          </span>
        </div>
        <div className={styles.auth_head}>
          <h1 className={styles.auth_title}>{title}</h1>
          {subtitle && <p className={styles.auth_subtitle}>{subtitle}</p>}
        </div>
        {children}
        <div className={styles.auth_trust}>
          <ShieldCheck size={13} />
          Bank-grade encryption · Private by default
        </div>
      </motion.div>
    </div>
  );
};
