"use client";

import { motion } from "framer-motion";
import { Search, Receipt } from "lucide-react";
import { PageIntro } from "@/components/PageIntro/PageIntro";
import { Card } from "@/components/Card/Card";
import { Input } from "@/components/Input/Input";
import { SegmentedControl } from "@/components/SegmentedControl/SegmentedControl";
import { TransactionItem } from "@/components/TransactionItem/TransactionItem";
import { EmptyState } from "@/components/EmptyState/EmptyState";
import { useTransactions } from "@/hooks/useTransactions";
import { useFinanceStore } from "@/store/financeStore";
import { dayLabel, formatCurrency } from "@/utils";
import { staggerContainer, listItem } from "@/themes/animations";
import type { TransactionType } from "@/types";
import styles from "./page.module.scss";

export default function CalendarPage() {
  const { filter, setFilter, grouped } = useTransactions();
  const currency = useFinanceStore((s) => s.profile?.currency ?? "INR");

  return (
    <motion.div
      className={styles.page}
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
    >
      <motion.div variants={listItem}>
        <PageIntro title="Timeline" subtitle="Search & filter your activity" />
        <div className={styles.controls}>
          <Input
            icon={Search}
            placeholder="Search merchant, note, category"
            value={filter.search}
            onChange={(e) => setFilter((f) => ({ ...f, search: e.target.value }))}
          />
          <SegmentedControl<TransactionType | "all">
            segments={[
              { label: "All", value: "all" },
              { label: "Income", value: "income" },
              { label: "Expense", value: "expense" },
            ]}
            value={filter.type}
            onChange={(value) => setFilter((f) => ({ ...f, type: value }))}
            size="sm"
          />
        </div>
      </motion.div>

      {grouped.length === 0 ? (
        <motion.div variants={listItem}>
          <Card surface="solid">
            <EmptyState
              icon={Receipt}
              title="No matches"
              description="Try a different search or filter."
            />
          </Card>
        </motion.div>
      ) : (
        grouped.map((group) => {
          const dayTotal = group.items
            .filter((t) => t.type === "expense")
            .reduce((acc, t) => acc + t.amount, 0);
          return (
            <motion.section key={group.day} variants={listItem} className={styles.group}>
              <div className={styles.group_head}>
                <span className={styles.group_day}>{dayLabel(group.day)}</span>
                <span className={styles.group_total}>
                  {formatCurrency(dayTotal, currency)}
                </span>
              </div>
              <Card surface="solid" padded={false} className={styles.group_list}>
                {group.items.map((transaction) => (
                  <TransactionItem
                    key={transaction.id}
                    transaction={transaction}
                    currency={currency}
                  />
                ))}
              </Card>
            </motion.section>
          );
        })
      )}
    </motion.div>
  );
}
