"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronRight, Landmark, PiggyBank } from "lucide-react";
import { Card } from "@/components/Card/Card";
import { MonthlySavingSheet } from "@/sections/MonthlySavingSheet/MonthlySavingSheet";
import { useFinanceStore } from "@/store/financeStore";
import {
  bankMonthFlow,
  currentMonthKey,
  formatCurrency,
  formatNumber,
  getCurrencySymbol,
  sumBy,
} from "@/utils";
import type { Account } from "@/types";
import styles from "./SavingsAccordion.module.scss";

export const SavingsAccordion = () => {
  const accounts = useFinanceStore((s) => s.accounts);
  const transactions = useFinanceStore((s) => s.transactions);
  const currency = useFinanceStore((s) => s.profile?.currency ?? "INR");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Account | null>(null);

  const banks = accounts.filter((a) => a.type === "savings");
  const total = sumBy(banks, (a) => a.balance);
  const month = currentMonthKey();

  return (
    <Card surface="solid" padded={false} className={styles.accordion}>
      <button
        type="button"
        className={styles.accordion_head}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <span className={styles.accordion_icon}>
          <PiggyBank size={22} />
        </span>
        <span className={styles.accordion_main}>
          <span className={styles.accordion_row}>
            <span className={styles.accordion_title}>Bank Savings</span>
            <span className={styles.accordion_amount}>
              <span className={styles.accordion_symbol}>{getCurrencySymbol()}</span>
              {formatNumber(total)}
            </span>
          </span>
          <span className={styles.accordion_subrow}>
            <span className={styles.accordion_sub}>
              {banks.length} bank{banks.length === 1 ? "" : "s"}
            </span>
            <motion.span
              className={styles.accordion_chevron}
              animate={{ rotate: open ? 90 : 0 }}
              transition={{ duration: 0.2 }}
            >
              <ChevronRight size={18} />
            </motion.span>
          </span>
        </span>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            className={styles.accordion_body}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className={styles.accordion_list}>
              {banks.map((bank) => {
                const flow = bankMonthFlow(bank.id, transactions, month);
                const lastMonth = bank.balance - flow.net;
                return (
                  <button
                    key={bank.id}
                    type="button"
                    className={styles.row}
                    onClick={() => setEditing(bank)}
                  >
                    <span className={styles.row_icon}>
                      <Landmark size={16} />
                    </span>
                    <span className={styles.row_text}>
                      <span className={styles.row_label}>{bank.name}</span>
                      <span className={styles.row_sub}>
                        Last mo {formatCurrency(lastMonth, currency)}
                        {flow.net !== 0 && (
                          <span
                            className={
                              flow.net > 0 ? styles.row_in : styles.row_out
                            }
                          >
                            {" · "}
                            {flow.net > 0 ? "+" : "−"}
                            {formatCurrency(Math.abs(flow.net), currency)}
                          </span>
                        )}
                      </span>
                    </span>
                    <span className={styles.row_amount}>
                      {formatCurrency(bank.balance, currency)}
                    </span>
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <MonthlySavingSheet
        account={editing}
        open={editing !== null}
        onClose={() => setEditing(null)}
      />
    </Card>
  );
};
