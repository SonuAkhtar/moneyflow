"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { ChevronDown, Search } from "lucide-react";
import { Avatar } from "@/components/Avatar/Avatar";
import { ProfileMenu } from "@/components/ProfileMenu/ProfileMenu";
import { SyncBadge } from "@/components/SyncBadge/SyncBadge";
import { useFinanceStore } from "@/store/financeStore";
import { cn } from "@/utils";
import { ROUTES } from "@/constants";
import styles from "./AppHeader.module.scss";

export const AppHeader = () => {
  const profile = useFinanceStore((s) => s.profile);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
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
          src="/icons/header-logo.png"
          alt="moneyFlow"
          width={38}
          height={38}
          className={styles.header_logoImg}
        />
      </Link>

      <div className={styles.header_actions}>
        <SyncBadge />
        <Link
          href={ROUTES.transactions}
          className={styles.header_search}
          aria-label="Search transactions"
        >
          <Search size={19} />
        </Link>
        <div className={styles.header_avatar}>
          <button
            ref={triggerRef}
            type="button"
            className={cn(
              styles.header_profile,
              menuOpen && styles["header_profile--open"],
            )}
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="Account menu"
            aria-expanded={menuOpen}
            aria-controls={menuOpen ? menuId : undefined}
          >
            <span className={styles.header_avatarRing}>
              <Avatar
                name={profile?.fullName ?? "MF"}
                src={profile?.avatarUrl}
                size={30}
              />
            </span>
            {firstName && (
              <span className={styles.header_name}>{firstName}</span>
            )}
            <ChevronDown size={15} className={styles.header_chevron} />
          </button>
          <ProfileMenu
            id={menuId}
            open={menuOpen}
            onClose={() => setMenuOpen(false)}
            triggerRef={triggerRef}
          />
        </div>
      </div>
    </header>
  );
};
