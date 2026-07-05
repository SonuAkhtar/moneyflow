"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
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

  const firstName = profile?.fullName?.trim().split(" ")[0] ?? "";

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
          className={cn(
            styles.header_profile,
            menuOpen && styles["header_profile--open"],
          )}
          onClick={() => setMenuOpen((v) => !v)}
          aria-label="Account menu"
          aria-expanded={menuOpen}
        >
          <span className={styles.header_avatarRing}>
            <Avatar
              name={profile?.fullName ?? "MF"}
              src={profile?.avatarUrl}
              size={30}
            />
          </span>
          {firstName && <span className={styles.header_name}>{firstName}</span>}
          <ChevronDown size={15} className={styles.header_chevron} />
        </button>
        <ProfileMenu open={menuOpen} onClose={() => setMenuOpen(false)} />
      </div>
    </header>
  );
};
