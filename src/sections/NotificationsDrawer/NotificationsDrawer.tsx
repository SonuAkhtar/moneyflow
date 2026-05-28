"use client";

import { AlertTriangle, Bell, BellOff, Sparkles, Trophy } from "lucide-react";
import { Drawer } from "@/components/Drawer/Drawer";
import { EmptyState } from "@/components/EmptyState/EmptyState";
import { Button } from "@/components/Button/Button";
import { useFinanceStore } from "@/store/financeStore";
import { useUiStore } from "@/store/uiStore";
import { relativeTime } from "@/utils";
import type { NotificationType } from "@/types";
import styles from "./NotificationsDrawer.module.scss";

const ICONS: Record<NotificationType, typeof Bell> = {
  alert: AlertTriangle,
  reminder: Bell,
  achievement: Trophy,
  digest: Sparkles,
  system: Bell,
};

export const NotificationsDrawer = () => {
  const open = useUiStore((s) => s.notificationsOpen);
  const toggle = useUiStore((s) => s.toggleNotifications);
  const notifications = useFinanceStore((s) => s.notifications);
  const markAll = useFinanceStore((s) => s.markAllNotificationsRead);
  const markRead = useFinanceStore((s) => s.markNotificationRead);

  return (
    <Drawer open={open} onClose={() => toggle(false)} title="Notifications">
      {notifications.length === 0 ? (
        <EmptyState
          icon={BellOff}
          title="All caught up"
          description="New alerts and reminders will appear here."
        />
      ) : (
        <div className={styles.list}>
          <Button variant="ghost" size="sm" onClick={markAll} className={styles.list_clear}>
            Mark all read
          </Button>
          {notifications.map((notification) => {
            const Icon = ICONS[notification.type];
            return (
              <button
                key={notification.id}
                className={`${styles.item} ${notification.read ? "" : styles["item--unread"]}`}
                onClick={() => markRead(notification.id)}
              >
                <span className={styles.item_icon}>
                  <Icon size={16} />
                </span>
                <span className={styles.item_body}>
                  <span className={styles.item_title}>{notification.title}</span>
                  <span className={styles.item_text}>{notification.body}</span>
                  <span className={styles.item_time}>
                    {relativeTime(notification.createdAt)}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      )}
    </Drawer>
  );
};
