"use client";

import Link from "next/link";
import { Bell, Wallet } from "lucide-react";
import { Avatar } from "@/components/Avatar/Avatar";
import { useFinanceStore } from "@/store/financeStore";
import { useUiStore } from "@/store/uiStore";
import { ROUTES } from "@/constants";
import styles from "./AppHeader.module.scss";

export const AppHeader = () => {
  const profile = useFinanceStore((s) => s.profile);
  const notifications = useFinanceStore((s) => s.notifications);
  const toggleNotifications = useUiStore((s) => s.toggleNotifications);
  const unread = notifications.filter((n) => !n.read).length;

  return (
    <header className={styles.header}>
      <Link href={ROUTES.home} className={styles.header_logo} aria-label="moneyFlow home">
        <span className={styles.header_mark}>
          <Wallet size={18} strokeWidth={2.4} />
        </span>
        <span className={styles.header_word}>
          money<span className={styles.header_wordAccent}>Flow</span>
        </span>
      </Link>

      <div className={styles.header_actions}>
        <button
          className={styles.header_bell}
          onClick={() => toggleNotifications(true)}
          aria-label="Notifications"
        >
          <Bell size={19} />
          {unread > 0 && <span className={styles.header_badge}>{unread}</span>}
        </button>
        <Link href={ROUTES.profile} aria-label="Open profile">
          <Avatar name={profile?.fullName ?? "MF"} src={profile?.avatarUrl} size={42} />
        </Link>
      </div>
    </header>
  );
};
