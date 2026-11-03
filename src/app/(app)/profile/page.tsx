"use client";

import { useState } from "react";
import { m } from "framer-motion";
import {
  Check,
  ChevronRight,
  Coins,
  ExternalLink,
  Flame,
  LogOut,
  Moon,
  Pencil,
  Trash2,
  Type,
} from "lucide-react";
import { Card } from "@/components/Card/Card";
import { Avatar } from "@/components/Avatar/Avatar";
import { Badge } from "@/components/Badge/Badge";
import { SectionHeader } from "@/components/SectionHeader/SectionHeader";
import { BottomSheet } from "@/components/BottomSheet/BottomSheet";
import { ConfirmDialog } from "@/components/ConfirmDialog/ConfirmDialog";
import { ThemeToggle } from "@/components/ThemeToggle/ThemeToggle";
import { FinancialHealth } from "@/sections/FinancialHealth/FinancialHealth";
import { EditProfileSheet } from "@/sections/EditProfileSheet/EditProfileSheet";
import { SalaryManager } from "@/sections/SalaryManager/SalaryManager";
import { SpendBudget } from "@/sections/SpendBudget/SpendBudget";
import { OtherIncomeManager } from "@/sections/OtherIncomeManager/OtherIncomeManager";
import { DataExport } from "@/sections/DataExport/DataExport";
import { DeleteAccount } from "@/sections/DeleteAccount/DeleteAccount";
import { useFinanceStore } from "@/store/financeStore";
import { FONTS, useThemeStore } from "@/store/themeStore";
import { useSignOut } from "@/hooks/useSignOut";
import { cn, currentStreak, monthLabel } from "@/utils";
import { staggerContainer, listItem } from "@/themes/animations";
import styles from "./page.module.scss";

export default function ProfilePage() {
  const profile = useFinanceStore((s) => s.profile);
  const transactions = useFinanceStore((s) => s.transactions);
  const signOut = useSignOut();
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [signOutOpen, setSignOutOpen] = useState(false);
  const [fontOpen, setFontOpen] = useState(false);
  const font = useThemeStore((s) => s.font);
  const setFont = useThemeStore((s) => s.setFont);
  const fontLabel = FONTS.find((f) => f.id === font)?.label;

  const currency = profile?.currency ?? "INR";
  const streak = currentStreak(transactions);

  if (!profile) return null;

  return (
    <m.div
      className={styles.page}
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
    >
      <m.div variants={listItem}>
        <Card surface="gradient" glow="lime" className={styles.identity}>
          <Avatar name={profile.fullName} src={profile.avatarUrl} size={64} />
          <div className={styles.identity_info}>
            <span className={styles.identity_name}>{profile.fullName}</span>
            <span className={styles.identity_email}>{profile.email}</span>
            <span className={styles.identity_meta}>
              <Badge tone="orange">
                <Flame size={12} /> {streak} day streak
              </Badge>
              <span className={styles.identity_since}>
                Since {monthLabel(profile.createdAt.slice(0, 7))}
              </span>
            </span>
          </div>
          <button
            className={styles.identity_edit}
            onClick={() => setEditOpen(true)}
            aria-label="Edit profile"
          >
            <Pencil size={16} />
          </button>
        </Card>
      </m.div>

      <m.div variants={listItem}>
        <FinancialHealth />
      </m.div>

      <m.section className={styles.group} variants={listItem}>
        <SectionHeader title="Money" caption="Income and spending limits" />
        <div className={styles.stack}>
          <SalaryManager />
          <OtherIncomeManager />
          <SpendBudget />
        </div>
      </m.section>

      <m.section className={styles.group} variants={listItem}>
        <SectionHeader title="Preferences" />
        <Card surface="solid" padded={false} className={styles.list}>
          <div className={styles.item}>
            <span className={cn(styles.item_icon, styles["item_icon--violet"])}>
              <Moon size={18} />
            </span>
            <span className={styles.item_label}>Dark mode</span>
            <ThemeToggle />
          </div>
          <button
            type="button"
            className={styles.item}
            onClick={() => setFontOpen(true)}
          >
            <span className={cn(styles.item_icon, styles["item_icon--amber"])}>
              <Type size={18} />
            </span>
            <span className={styles.item_label}>Font</span>
            <span className={styles.item_value}>{fontLabel}</span>
            <ChevronRight size={16} className={styles.item_chevron} />
          </button>
          <div className={styles.item}>
            <span className={cn(styles.item_icon, styles["item_icon--blue"])}>
              <Coins size={18} />
            </span>
            <span className={styles.item_label}>Currency</span>
            <span className={styles.item_value}>{currency}</span>
          </div>
        </Card>
      </m.section>

      <m.div variants={listItem}>
        <DataExport />
      </m.div>

      <m.section className={styles.group} variants={listItem}>
        <SectionHeader title="Account" />
        <Card surface="solid" padded={false} className={styles.list}>
          <button
            type="button"
            className={styles.item}
            onClick={() => setSignOutOpen(true)}
          >
            <span className={styles.item_icon}>
              <LogOut size={18} />
            </span>
            <span className={styles.item_label}>Sign out</span>
            <ChevronRight size={16} className={styles.item_chevron} />
          </button>
          <button
            type="button"
            className={styles.item}
            onClick={() => setDeleteOpen(true)}
          >
            <span className={cn(styles.item_icon, styles["item_icon--danger"])}>
              <Trash2 size={18} />
            </span>
            <span className={styles.item_text}>
              <span className={cn(styles.item_label, styles.danger)}>
                Delete account
              </span>
              <span className={styles.item_sub}>
                Permanently remove your account and data
              </span>
            </span>
            <ChevronRight size={16} className={styles.item_chevron} />
          </button>
        </Card>
      </m.section>

      <m.a
        variants={listItem}
        className={styles.credit}
        href="https://riyaz-iota.vercel.app/"
        target="_blank"
        rel="noopener noreferrer"
      >
        Created by Riyaz Akhtar <ExternalLink size={12} />
      </m.a>

      <DeleteAccount open={deleteOpen} onClose={() => setDeleteOpen(false)} />

      <ConfirmDialog
        open={signOutOpen}
        title="Sign out?"
        message="You'll need to sign back in to access your dashboard."
        confirmLabel="Sign out"
        onConfirm={() => {
          setSignOutOpen(false);
          void signOut();
        }}
        onCancel={() => setSignOutOpen(false)}
      />

      <BottomSheet
        open={fontOpen}
        onClose={() => setFontOpen(false)}
        title="App font"
        description="Applies to the whole app on this device."
      >
        <div className={styles.fonts} role="radiogroup" aria-label="App font">
          {FONTS.map((option) => {
            const active = option.id === font;
            return (
              <button
                key={option.id}
                type="button"
                role="radio"
                aria-checked={active}
                className={cn(styles.font, active && styles["font--active"])}
                style={{ fontFamily: `var(--font-${option.id})` }}
                onClick={() => setFont(option.id)}
              >
                <span className={styles.font_sample}>Aa</span>
                <span className={styles.font_text}>
                  <span className={styles.font_name}>{option.label}</span>
                  <span className={styles.font_note}>
                    {option.note} · ₹1,24,500
                  </span>
                </span>
                {active && <Check size={18} className={styles.font_check} />}
              </button>
            );
          })}
        </div>
      </BottomSheet>
      <EditProfileSheet open={editOpen} onClose={() => setEditOpen(false)} />
    </m.div>
  );
}
