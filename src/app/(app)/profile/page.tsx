"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  CalendarClock,
  ChevronRight,
  Flame,
  LogOut,
  MoonStar,
  Pencil,
  PiggyBank,
  Repeat,
  RotateCcw,
  Target,
  Wallet,
} from "lucide-react";
import { PageIntro } from "@/components/PageIntro/PageIntro";
import { Card } from "@/components/Card/Card";
import { Avatar } from "@/components/Avatar/Avatar";
import { Badge } from "@/components/Badge/Badge";
import { Button } from "@/components/Button/Button";
import { ThemeToggle } from "@/components/ThemeToggle/ThemeToggle";
import { EditProfileSheet } from "@/sections/EditProfileSheet/EditProfileSheet";
import { useFinanceStore } from "@/store/financeStore";
import { useAuthStore } from "@/store/authStore";
import { authService } from "@/services/auth.service";
import { useToast } from "@/hooks/useToast";
import { formatCurrency, monthLabel } from "@/utils";
import { ROUTES } from "@/constants";
import { staggerContainer, listItem } from "@/themes/animations";
import styles from "./page.module.scss";

const QUICK_LINKS = [
  { href: ROUTES.goals, label: "Saving goals", icon: Target },
  { href: ROUTES.subscriptions, label: "Subscriptions", icon: Repeat },
  { href: ROUTES.calendar, label: "Transaction timeline", icon: CalendarClock },
];

export default function ProfilePage() {
  const router = useRouter();
  const profile = useFinanceStore((s) => s.profile);
  const accounts = useFinanceStore((s) => s.accounts);
  const goals = useFinanceStore((s) => s.goals);
  const transactions = useFinanceStore((s) => s.transactions);
  const resetAll = useFinanceStore((s) => s.resetAll);
  const bootstrap = useFinanceStore((s) => s.bootstrap);
  const user = useAuthStore((s) => s.user);
  const clearAuth = useAuthStore((s) => s.clear);
  const toast = useToast();
  const [editOpen, setEditOpen] = useState(false);

  const currency = profile?.currency ?? "INR";

  const signOut = async () => {
    await authService.signOut();
    clearAuth();
    resetAll();
    router.replace(ROUTES.login);
  };

  const resetDemo = () => {
    resetAll();
    if (user) bootstrap(user.id, user.fullName, user.email);
    toast({ title: "Demo data refreshed", variant: "success" });
  };

  if (!profile) return null;

  return (
    <motion.div
      className={styles.page}
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
    >
      <motion.div variants={listItem}>
        <PageIntro title="Profile" />
        <Card surface="gradient" glow="lime" className={styles.identity}>
          <Avatar name={profile.fullName} src={profile.avatarUrl} size={64} />
          <div className={styles.identity_info}>
            <span className={styles.identity_name}>{profile.fullName}</span>
            <span className={styles.identity_email}>{profile.email}</span>
            {profile.phone && (
              <span className={styles.identity_email}>{profile.phone}</span>
            )}
            <Badge tone="orange" className={styles.identity_streak}>
              <Flame size={12} /> {profile.streakCount} day streak
            </Badge>
          </div>
          <button
            className={styles.identity_edit}
            onClick={() => setEditOpen(true)}
            aria-label="Edit profile"
          >
            <Pencil size={16} />
          </button>
        </Card>
      </motion.div>

      <motion.div className={styles.stats} variants={listItem}>
        <Card surface="solid" className={styles.stat}>
          <Wallet size={18} className={styles.stat_icon} />
          <span className={styles.stat_value}>{accounts.length}</span>
          <span className={styles.stat_label}>Wallets</span>
        </Card>
        <Card surface="solid" className={styles.stat}>
          <Target size={18} className={styles.stat_icon} />
          <span className={styles.stat_value}>{goals.length}</span>
          <span className={styles.stat_label}>Goals</span>
        </Card>
        <Card surface="solid" className={styles.stat}>
          <PiggyBank size={18} className={styles.stat_icon} />
          <span className={styles.stat_value}>{transactions.length}</span>
          <span className={styles.stat_label}>Records</span>
        </Card>
      </motion.div>

      <motion.div variants={listItem}>
        <Card surface="solid" padded={false} className={styles.menu}>
          {QUICK_LINKS.map((link) => (
            <Link key={link.href} href={link.href} className={styles.menu_item}>
              <span className={styles.menu_icon}>
                <link.icon size={18} />
              </span>
              <span className={styles.menu_label}>{link.label}</span>
              <ChevronRight size={18} className={styles.menu_chevron} />
            </Link>
          ))}
        </Card>
      </motion.div>

      <motion.div variants={listItem}>
        <Card surface="solid" className={styles.appearance}>
          <span className={styles.appearance_icon}>
            <MoonStar size={18} />
          </span>
          <div className={styles.appearance_text}>
            <span className={styles.appearance_title}>Dark mode</span>
            <span className={styles.appearance_sub}>Switch between light and dark</span>
          </div>
          <ThemeToggle />
        </Card>
      </motion.div>

      <motion.div variants={listItem}>
        <Card surface="solid" className={styles.settings}>
          <div className={styles.row}>
            <span className={styles.row_label}>Monthly salary</span>
            <span className={styles.row_value}>
              {formatCurrency(profile.monthlySalary, currency)}
            </span>
          </div>
          <div className={styles.row}>
            <span className={styles.row_label}>Savings target</span>
            <span className={styles.row_value}>
              {formatCurrency(profile.savingsTarget, currency)}
            </span>
          </div>
          <div className={styles.row}>
            <span className={styles.row_label}>Member since</span>
            <span className={styles.row_value}>
              {monthLabel(profile.createdAt.slice(0, 7))}
            </span>
          </div>
        </Card>
      </motion.div>

      <motion.div className={styles.actions} variants={listItem}>
        <Button variant="secondary" fullWidth icon={RotateCcw} onClick={resetDemo}>
          Reset demo data
        </Button>
        <Button variant="danger" fullWidth size="lg" icon={LogOut} onClick={signOut}>
          Sign out
        </Button>
      </motion.div>

      <EditProfileSheet open={editOpen} onClose={() => setEditOpen(false)} />
    </motion.div>
  );
}
