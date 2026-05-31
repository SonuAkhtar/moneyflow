"use client";

import { useState } from "react";
import Link from "next/link";
import { Avatar } from "@/components/Avatar/Avatar";
import { ProfileMenu } from "@/components/ProfileMenu/ProfileMenu";
import { useFinanceStore } from "@/store/financeStore";
import { ROUTES } from "@/constants";
import styles from "./AppHeader.module.scss";

export const AppHeader = () => {
  const profile = useFinanceStore((s) => s.profile);
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className={styles.header}>
      <Link
        href={ROUTES.home}
        className={styles.header_logo}
        aria-label="moneyFlow home"
      >
        <span className={styles.header_word}>
          MoneY<span className={styles.header_wordAccent}>Flow</span>
        </span>
      </Link>

      <div className={styles.header_avatar}>
        <button
          type="button"
          onClick={() => setMenuOpen((v) => !v)}
          aria-label="Account menu"
          aria-expanded={menuOpen}
        >
          <Avatar
            name={profile?.fullName ?? "MF"}
            src={profile?.avatarUrl}
            size={42}
          />
        </button>
        <ProfileMenu open={menuOpen} onClose={() => setMenuOpen(false)} />
      </div>
    </header>
  );
};
