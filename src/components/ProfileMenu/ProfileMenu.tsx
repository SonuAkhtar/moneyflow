"use client";

import { useState } from "react";
import { AnimatePresence, m } from "framer-motion";
import { LogOut } from "lucide-react";
import { Avatar } from "@/components/Avatar/Avatar";
import { ThemeToggle } from "@/components/ThemeToggle/ThemeToggle";
import { ConfirmDialog } from "@/components/ConfirmDialog/ConfirmDialog";
import { useFinanceStore } from "@/store/financeStore";
import { useSignOut } from "@/hooks/useSignOut";
import styles from "./ProfileMenu.module.scss";

interface ProfileMenuProps {
  open: boolean;
  onClose: () => void;
}

export const ProfileMenu = ({ open, onClose }: ProfileMenuProps) => {
  const profile = useFinanceStore((s) => s.profile);
  const signOut = useSignOut();
  const [confirmOpen, setConfirmOpen] = useState(false);

  return (
    <>
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
              className={styles.menu}
              initial={{ opacity: 0, y: -8, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.96 }}
              transition={{ type: "spring", stiffness: 440, damping: 30 }}
              role="menu"
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
    </>
  );
};
