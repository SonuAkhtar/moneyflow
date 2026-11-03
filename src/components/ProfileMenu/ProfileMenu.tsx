"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { AnimatePresence, m } from "framer-motion";
import { LogOut } from "lucide-react";
import { Avatar } from "@/components/Avatar/Avatar";
import { Portal } from "@/components/Portal/Portal";
import { ThemeToggle } from "@/components/ThemeToggle/ThemeToggle";
import { ConfirmDialog } from "@/components/ConfirmDialog/ConfirmDialog";
import { useFinanceStore } from "@/store/financeStore";
import { useSignOut } from "@/hooks/useSignOut";
import styles from "./ProfileMenu.module.scss";

interface ProfileMenuProps {
  id: string;
  open: boolean;
  onClose: () => void;
  triggerRef: RefObject<HTMLButtonElement | null>;
}

export const ProfileMenu = ({
  id,
  open,
  onClose,
  triggerRef,
}: ProfileMenuProps) => {
  const profile = useFinanceStore((s) => s.profile);
  const signOut = useSignOut();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    if (!open) return;
    const menu = menuRef.current;
    const trigger = triggerRef.current;
    const timer = window.setTimeout(
      () => menuRef.current?.querySelector<HTMLElement>("button")?.focus(),
      0,
    );
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onCloseRef.current();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      window.clearTimeout(timer);
      const active = document.activeElement;
      if (!active || active === document.body || menu?.contains(active)) {
        trigger?.focus();
      }
    };
  }, [open, triggerRef]);

  return (
    <Portal>
      <AnimatePresence>
        {open && (
          <>
            <m.div
              className={styles.backdrop}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
            />
            <m.div
              ref={menuRef}
              id={id}
              className={styles.menu}
              initial={{ opacity: 0, y: -8, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.96 }}
              transition={{ type: "spring", stiffness: 440, damping: 30 }}
              role="group"
              aria-label="Profile menu"
              onBlur={(e) => {
                const next = e.relatedTarget;
                if (
                  next &&
                  !e.currentTarget.contains(next) &&
                  !triggerRef.current?.contains(next)
                ) {
                  onClose();
                }
              }}
            >
              <div className={styles.menu_head}>
                <Avatar
                  name={profile?.fullName ?? "MF"}
                  src={profile?.avatarUrl}
                  size={46}
                />
                <div className={styles.menu_identity}>
                  <span className={styles.menu_name}>{profile?.fullName}</span>
                  <span className={styles.menu_email}>{profile?.email}</span>
                </div>
              </div>

              <div className={styles.menu_toggle}>
                <span className={styles.menu_toggleLabel}>App theme</span>
                <ThemeToggle />
              </div>

              <span className={styles.menu_divider} />

              <button
                type="button"
                className={`${styles.menu_item} ${styles["menu_item--danger"]}`}
                onClick={() => {
                  onClose();
                  setConfirmOpen(true);
                }}
              >
                <LogOut size={18} />
                <span>Sign out</span>
              </button>
            </m.div>
          </>
        )}
      </AnimatePresence>

      <ConfirmDialog
        open={confirmOpen}
        title="Sign out?"
        message="You'll need to sign back in to access your dashboard."
        confirmLabel="Sign out"
        onConfirm={() => {
          setConfirmOpen(false);
          void signOut();
        }}
        onCancel={() => setConfirmOpen(false)}
      />
    </Portal>
  );
};
