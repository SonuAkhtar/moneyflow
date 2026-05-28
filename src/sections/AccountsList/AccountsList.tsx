"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Building2, Plus, Star } from "lucide-react";
import { Card } from "@/components/Card/Card";
import { SectionHeader } from "@/components/SectionHeader/SectionHeader";
import { AddAccountSheet } from "@/sections/AddAccountSheet/AddAccountSheet";
import { useFinanceStore } from "@/store/financeStore";
import { sumBy, formatCurrency } from "@/utils";
import { listItem, staggerContainer } from "@/themes/animations";
import styles from "./AccountsList.module.scss";

export const AccountsList = () => {
  const accounts = useFinanceStore((s) => s.accounts);
  const currency = useFinanceStore((s) => s.profile?.currency ?? "INR");
  const [sheetOpen, setSheetOpen] = useState(false);
  const total = sumBy(accounts, (a) => a.balance);

  return (
    <section>
      <SectionHeader
        title="Wallets"
        caption={`${accounts.length} accounts`}
        actionLabel="Add"
        onAction={() => setSheetOpen(true)}
      />

      <Card surface="gradient" glow="lime" className={styles.total}>
        <span className={styles.total_label}>Net worth</span>
        <span className={styles.total_value}>{formatCurrency(total, currency)}</span>
      </Card>

      <motion.div
        className={styles.grid}
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
      >
        {accounts.map((account) => (
          <motion.div key={account.id} variants={listItem}>
            <Card surface="solid" className={styles.card}>
              <span
                className={styles.card_accent}
                style={{ background: account.colorTag }}
              />
              <div className={styles.card_head}>
                <span className={styles.card_name}>{account.name}</span>
                {account.isPrimary && (
                  <span className={styles.card_primary}>
                    <Star size={12} fill="currentColor" />
                  </span>
                )}
              </div>
              <span className={styles.card_balance}>
                {formatCurrency(account.balance, currency)}
              </span>
              <span className={styles.card_meta}>
                <Building2 size={12} />
                {account.institution ?? account.type}
              </span>
            </Card>
          </motion.div>
        ))}

        <motion.button
          variants={listItem}
          type="button"
          className={styles.add}
          onClick={() => setSheetOpen(true)}
        >
          <Plus size={22} />
          <span>Add wallet</span>
        </motion.button>
      </motion.div>

      <AddAccountSheet open={sheetOpen} onClose={() => setSheetOpen(false)} />
    </section>
  );
};
