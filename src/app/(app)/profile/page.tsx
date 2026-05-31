"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { ExternalLink, Flame, LogOut, Pencil } from "lucide-react";
import { Card } from "@/components/Card/Card";
import { Avatar } from "@/components/Avatar/Avatar";
import { Badge } from "@/components/Badge/Badge";
import { Button } from "@/components/Button/Button";
import { ThemeToggle } from "@/components/ThemeToggle/ThemeToggle";
import { FinancialHealth } from "@/sections/FinancialHealth/FinancialHealth";
import { EditProfileSheet } from "@/sections/EditProfileSheet/EditProfileSheet";
import { SalaryManager } from "@/sections/SalaryManager/SalaryManager";
import { OtherIncomeManager } from "@/sections/OtherIncomeManager/OtherIncomeManager";
import { useFinanceStore } from "@/store/financeStore";
import { useSignOut } from "@/hooks/useSignOut";
import { monthLabel } from "@/utils";
import { staggerContainer, listItem } from "@/themes/animations";
import styles from "./page.module.scss";

export default function ProfilePage() {
  const profile = useFinanceStore((s) => s.profile);
  const signOut = useSignOut();
  const [editOpen, setEditOpen] = useState(false);

  const currency = profile?.currency ?? "INR";

  if (!profile) return null;

  return (
    <motion.div
      className={styles.page}
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
    >
      <motion.div variants={listItem}>
        <Card surface="gradient" glow="lime" className={styles.identity}>
          <Avatar name={profile.fullName} src={profile.avatarUrl} size={64} />
          <div className={styles.identity_info}>
            <span className={styles.identity_name}>{profile.fullName}</span>
            <span className={styles.identity_email}>{profile.email}</span>
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

      <motion.div variants={listItem}>
        <FinancialHealth />
      </motion.div>

      <motion.div variants={listItem}>
        <SalaryManager />
      </motion.div>

      <motion.div variants={listItem}>
        <OtherIncomeManager />
      </motion.div>

      <motion.div className={styles.actions} variants={listItem}>
        <Button
          variant="danger"
          fullWidth
          size="lg"
          icon={LogOut}
          onClick={signOut}
        >
          Sign out
        </Button>
      </motion.div>

      <motion.div variants={listItem}>
        <Card surface="solid" className={styles.settings}>
          <div className={styles.row}>
            <span className={styles.row_label}>Dark mode</span>
            <ThemeToggle />
          </div>
          <div className={styles.row}>
            <span className={styles.row_label}>Currency</span>
            <span className={styles.row_value}>{currency}</span>
          </div>
          <div className={styles.row}>
            <span className={styles.row_label}>Member since</span>
            <span className={styles.row_value}>
              {monthLabel(profile.createdAt.slice(0, 7))}
            </span>
          </div>
          <a
            className={styles.credit}
            href="https://riyaz-iota.vercel.app/"
            target="_blank"
            rel="noopener noreferrer"
          >
            <span className={styles.credit_label}>Created by Riyaz Akhtar</span>
            <span className={styles.credit_link}>
              Portfolio <ExternalLink size={13} />
            </span>
          </a>
        </Card>
      </motion.div>

      <EditProfileSheet open={editOpen} onClose={() => setEditOpen(false)} />
    </motion.div>
  );
}
