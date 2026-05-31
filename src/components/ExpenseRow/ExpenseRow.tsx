"use client";

import { memo } from "react";
import { motion } from "framer-motion";
import { ArrowRight, CalendarDays } from "lucide-react";
import { getCategoryMeta } from "@/constants/categories";
import { formatCurrency, formatMoneyShort, dayShort, truncate } from "@/utils";
import type { Transaction } from "@/types";
import type { BalancePoint } from "@/hooks/useBalanceTrail";
import styles from "./ExpenseRow.module.scss";

interface ExpenseRowProps {
  transaction: Transaction;
  currency: string;
  balance?: BalancePoint;
  onClick?: (transaction: Transaction) => void;
}

export const ExpenseRow = memo(function ExpenseRow({
  transaction,
  currency,
  balance,
  onClick,
}: ExpenseRowProps) {
  const meta = getCategoryMeta(transaction.category);
  const Icon = meta.icon;

  return (
    <motion.button
      type="button"
      className={styles.row}
      onClick={() => onClick?.(transaction)}
      whileTap={{ scale: 0.98 }}
      layout
    >
      <span
        className={styles.row_icon}
        style={{ background: `${meta.color}1f`, color: meta.color }}
      >
        <Icon size={18} />
      </span>
      <span className={styles.row_main}>
        <span className={styles.row_title}>
          {truncate(transaction.merchant ?? meta.label, 22)}
        </span>
        <span className={styles.row_meta}>
          <span className={styles.row_cat}>{meta.label}</span>
          <span className={styles.row_date}>
            <CalendarDays size={11} className={styles.row_dateIcon} />
            {dayShort(transaction.occurredAt)}
          </span>
        </span>
      </span>
      <span className={styles.row_right}>
        <span className={styles.row_amount}>
          -{formatCurrency(transaction.amount, currency)}
        </span>
        {balance && (
          <span className={styles.row_bal}>
            <span className={styles.row_before}>
              {formatMoneyShort(balance.before)}
            </span>
            <ArrowRight size={11} className={styles.row_arrow} />
            <span className={styles.row_after}>
              {formatMoneyShort(balance.after)}
            </span>
          </span>
        )}
      </span>
    </motion.button>
  );
});
