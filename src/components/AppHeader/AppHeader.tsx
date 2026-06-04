"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Avatar } from "@/components/Avatar/Avatar";
import { ProfileMenu } from "@/components/ProfileMenu/ProfileMenu";
import { useFinanceStore } from "@/store/financeStore";
import { cn } from "@/utils";
import { ROUTES } from "@/constants";
import styles from "./AppHeader.module.scss";

export const AppHeader = () => {
  const profile = useFinanceStore((s) => s.profile);
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(styles.header, scrolled && styles["header--scrolled"])}
    >
      <Link
        href={ROUTES.home}
        className={styles.header_logo}
        aria-label="moneyFlow home"
      >
        <img
          src="/icons/moneyflow-logo.png"
          alt="moneyFlow"
          width={38}
          height={38}
          className={styles.header_logoImg}
        />
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
