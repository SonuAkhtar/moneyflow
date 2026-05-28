"use client";

import { motion } from "framer-motion";
import { getCategoryMeta } from "@/constants/categories";
import { formatCurrency, truncate, timeLabel, cn } from "@/utils";
import type { Transaction } from "@/types";
import styles from "./TransactionItem.module.scss";

interface TransactionItemProps {
  transaction: Transaction;
  currency?: string;
  onClick?: (transaction: Transaction) => void;
}

export const TransactionItem = ({
  transaction,
  currency = "INR",
  onClick,
}: TransactionItemProps) => {
  const meta = getCategoryMeta(transaction.category);
  const Icon = meta.icon;
  const isIncome = transaction.type === "income";
  const sign = isIncome ? "+" : transaction.type === "expense" ? "-" : "";

  return (
    <motion.button
      type="button"
      className={styles.item}
      onClick={() => onClick?.(transaction)}
      whileTap={{ scale: 0.98 }}
      layout
    >
      <span
        className={styles.item_icon}
        style={{ background: `${meta.color}1f`, color: meta.color }}
      >
        <Icon size={18} />
      </span>
      <span className={styles.item_main}>
        <span className={styles.item_title}>
          {truncate(transaction.merchant ?? meta.label, 22)}
        </span>
        <span className={styles.item_meta}>
          {meta.label} · {timeLabel(transaction.occurredAt)}
        </span>
      </span>
      <span
        className={cn(
          styles.item_amount,
          isIncome ? styles["item_amount--in"] : styles["item_amount--out"],
        )}
      >
        {sign}
        {formatCurrency(transaction.amount, currency)}
      </span>
    </motion.button>
  );
};
