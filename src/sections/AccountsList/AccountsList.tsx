"use client";

import { useMemo, useState, type CSSProperties } from "react";
import { m } from "framer-motion";
import { ArrowDownRight, ArrowUpRight, Landmark, Plus } from "lucide-react";
import { Card } from "@/components/Card/Card";
import { SectionHeader } from "@/components/SectionHeader/SectionHeader";
import { AddSavingsSheet } from "@/sections/AddSavingsSheet/AddSavingsSheet";
import { useFinanceStore } from "@/store/financeStore";
import {
  bankMonthFlow,
  cn,
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
        <span
          className={cn(
            styles.total_value,
            total < 0 && styles["total_value--neg"],
          )}
        >
          {formatCurrency(total, currency)}
        </span>
        <span className={styles.total_meta}>
          Across {banks.length} bank{banks.length === 1 ? "" : "s"}
        </span>
      </Card>

      <m.div
        className={styles.grid}
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
      >
        {banks.map((bank) => {
          const flow = bankMonthFlow(bank.id, transactions, month);
          const share =
            total > 0 ? Math.round((bank.balance / total) * 100) : 0;
          const fillWidth = Math.max(0, Math.min(100, share));
          return (
            <m.div key={bank.id} variants={listItem}>
              <Card
                surface="solid"
                interactive
                className={styles.card}
                style={{ "--bank": bank.colorTag } as CSSProperties}
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
                <div className={styles.card_head}>
                  <span
                    className={styles.card_icon}
                    style={{
                      background: `${bank.colorTag}1f`,
                      color: bank.colorTag,
                    }}
                  >
                    <Landmark size={15} />
                  </span>
                  <span className={styles.card_name}>{bank.name}</span>
                </div>
                <span
                  className={cn(
                    styles.card_balance,
                    bank.balance < 0 && styles["card_balance--neg"],
                  )}
                >
                  {formatCurrency(bank.balance, currency)}
                </span>
                <span className={styles.card_track}>
                  <span
                    className={styles.card_fill}
                    style={{ width: `${fillWidth}%` }}
                  />
                </span>
                <div className={styles.card_foot}>
                  <span className={styles.card_share}>{share}% of savings</span>
                  {flow.net !== 0 && (
                    <span
                      className={cn(
                        styles.card_delta,
                        flow.net > 0
                          ? styles["card_delta--in"]
                          : styles["card_delta--out"],
                      )}
                    >
                      {flow.net > 0 ? (
                        <ArrowUpRight size={11} />
                      ) : (
                        <ArrowDownRight size={11} />
                      )}
                      {formatCurrency(Math.abs(flow.net), currency)}
                    </span>
                  )}
                </div>
              </Card>
            </m.div>
          );
        })}

        <m.button
          variants={listItem}
          type="button"
          className={styles.add}
          onClick={() => setAddOpen(true)}
        >
          <Plus size={18} />
          <span>Add bank</span>
        </m.button>
      </m.div>

      <AddSavingsSheet
        key={editing?.id ?? "new"}
        open={sheetOpen}
        account={editing}
        onClose={closeSheet}
      />
    </section>
  );
};
