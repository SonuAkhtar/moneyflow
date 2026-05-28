"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ChevronRight, Repeat } from "lucide-react";
import { PageIntro } from "@/components/PageIntro/PageIntro";
import { Card } from "@/components/Card/Card";
import { AccountsList } from "@/sections/AccountsList/AccountsList";
import { EmiList } from "@/sections/EmiList/EmiList";
import { useFinanceStore } from "@/store/financeStore";
import { sumBy, formatCurrency } from "@/utils";
import { staggerContainer, listItem } from "@/themes/animations";
import { ROUTES } from "@/constants";
import styles from "./page.module.scss";

export default function WalletsPage() {
  const subscriptions = useFinanceStore((s) => s.subscriptions);
  const currency = useFinanceStore((s) => s.profile?.currency ?? "INR");
  const monthly = sumBy(
    subscriptions.filter((s) => s.isActive && s.cycle === "monthly"),
    (s) => s.amount,
  );

  return (
    <motion.div
      className={styles.page}
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
    >
      <motion.div variants={listItem}>
        <PageIntro title="Wallets" subtitle="Accounts, loans & recurring" />
        <AccountsList />
      </motion.div>

      <motion.div variants={listItem}>
        <EmiList />
      </motion.div>

      <motion.div variants={listItem}>
        <Link href={ROUTES.subscriptions}>
          <Card surface="solid" interactive className={styles.subs}>
            <span className={styles.subs_icon}>
              <Repeat size={18} />
            </span>
            <div className={styles.subs_text}>
              <span className={styles.subs_title}>Subscriptions</span>
              <span className={styles.subs_meta}>
                {formatCurrency(monthly, currency)} / mo recurring
              </span>
            </div>
            <ChevronRight size={18} className={styles.subs_arrow} />
          </Card>
        </Link>
      </motion.div>
    </motion.div>
  );
}
