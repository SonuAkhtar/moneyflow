"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Landmark, Plus } from "lucide-react";
import { Card } from "@/components/Card/Card";
import { SectionHeader } from "@/components/SectionHeader/SectionHeader";
import { AddSavingsSheet } from "@/sections/AddSavingsSheet/AddSavingsSheet";
import { useFinanceStore } from "@/store/financeStore";
import {
  accountMonthDelta,
  bankMonthFlow,
  currentMonthKey,
  sumBy,
  formatCurrency,
} from "@/utils";
import { listItem, staggerContainer } from "@/themes/animations";
import type { Account } from "@/types";
import styles from "./AccountsList.module.scss";

export const AccountsList = () => {
  const accounts = useFinanceStore((s) => s.accounts);
  const transactions = useFinanceStore((s) => s.transactions);
  const currency = useFinanceStore((s) => s.profile?.currency ?? "INR");
  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<Account | null>(null);

  const banks = useMemo(
    () => accounts.filter((a) => a.type === "savings"),
    [accounts],
  );
  const total = sumBy(banks, (a) => a.balance);
  const month = currentMonthKey();

  const sheetOpen = addOpen || editing !== null;
  const closeSheet = () => {
    setAddOpen(false);
    setEditing(null);
  };

  return (
    <section>
      <SectionHeader
        title="Bank savings"
        caption={`${banks.length} bank${banks.length === 1 ? "" : "s"}`}
      />

      <Card surface="gradient" glow="lime" className={styles.total}>
        <span className={styles.total_label}>Total saved</span>
        <span className={styles.total_value}>
          {formatCurrency(total, currency)}
        </span>
      </Card>

      <motion.div
        className={styles.grid}
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
      >
        {banks.map((bank) => {
          const flow = bankMonthFlow(bank.id, transactions, month);
          const lastMonth =
            bank.balance - accountMonthDelta(bank.id, transactions, month);
          return (
            <motion.div key={bank.id} variants={listItem}>
              <Card
                surface="solid"
                interactive
                className={styles.card}
                role="button"
                tabIndex={0}
                aria-label={`Edit ${bank.name}`}
                onClick={() => setEditing(bank)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setEditing(bank);
                  }
                }}
              >
                <span className={styles.card_icon}>
                  <Landmark size={18} />
                </span>
                <span className={styles.card_name}>{bank.name}</span>
                <span className={styles.card_balance}>
                  {formatCurrency(bank.balance, currency)}
                </span>
                <span className={styles.card_meta}>
                  Last mo {formatCurrency(lastMonth, currency)}
                </span>
                {flow.net !== 0 && (
                  <span
                    className={flow.net > 0 ? styles.card_in : styles.card_out}
                  >
                    {flow.net > 0 ? "+" : "−"}
                    {formatCurrency(Math.abs(flow.net), currency)} this month
                  </span>
                )}
              </Card>
            </motion.div>
          );
        })}

        <motion.button
          variants={listItem}
          type="button"
          className={styles.add}
          onClick={() => setAddOpen(true)}
        >
          <Plus size={22} />
          <span>Add bank</span>
        </motion.button>
      </motion.div>

      <AddSavingsSheet
        key={editing?.id ?? "new"}
        open={sheetOpen}
        account={editing}
        onClose={closeSheet}
      />
    </section>
  );
};
