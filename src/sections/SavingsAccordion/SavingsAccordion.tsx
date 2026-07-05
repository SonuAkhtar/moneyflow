"use client";

import { useState } from "react";
import { AnimatePresence, m } from "framer-motion";
import { ChevronRight, Eye, EyeOff, Landmark, Wallet } from "lucide-react";
import { Card } from "@/components/Card/Card";
import { MonthlySavingSheet } from "@/sections/MonthlySavingSheet/MonthlySavingSheet";
import { useFinanceStore } from "@/store/financeStore";
import {
  accountMonthDelta,
  bankMonthFlow,
  cn,
  currentMonthKey,
  formatCurrency,
  formatNumber,
  getCurrencySymbol,
  sumBy,
} from "@/utils";
import type { Account } from "@/types";
import styles from "./SavingsAccordion.module.scss";

const maskFor = (n: number) =>
  "*".repeat(Math.max(1, String(Math.floor(Math.abs(n))).length));

export const SavingsAccordion = () => {
  const accounts = useFinanceStore((s) => s.accounts);
  const transactions = useFinanceStore((s) => s.transactions);
  const currency = useFinanceStore((s) => s.profile?.currency ?? "INR");
  const [open, setOpen] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [editing, setEditing] = useState<Account | null>(null);

  const banks = accounts.filter((a) => a.type === "savings");
  const total = sumBy(banks, (a) => a.balance);
  const month = currentMonthKey();

  const toggleReveal = () => setRevealed((v) => !v);

  return (
    <Card surface="solid" padded={false} className={styles.accordion}>
      <button
        type="button"
        className={styles.accordion_head}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <span className={styles.accordion_icon}>
          <Wallet size={22} />
        </span>
        <span className={styles.accordion_main}>
          <span className={styles.accordion_row}>
            <span className={styles.accordion_title}>Bank Savings</span>
            <span className={styles.accordion_amountWrap}>
              <span
                className={cn(
                  styles.accordion_amount,
                  total < 0 && styles["accordion_amount--neg"],
                )}
              >
                <span className={styles.accordion_symbol}>
                  {getCurrencySymbol()}
                </span>
                {revealed ? (
                  formatNumber(total)
                ) : (
                  <span className={styles.accordion_dots}>
                    {maskFor(total)}
                  </span>
                )}
              </span>
              <span
                role="button"
                tabIndex={0}
                className={styles.accordion_eye}
                aria-label={revealed ? "Hide amounts" : "Show amounts"}
                onClick={(e) => {
                  e.stopPropagation();
                  toggleReveal();
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    e.stopPropagation();
                    toggleReveal();
                  }
                }}
              >
                {revealed ? <Eye size={16} /> : <EyeOff size={16} />}
              </span>
            </span>
          </span>
          <span className={styles.accordion_subrow}>
            <span className={styles.accordion_sub}>
              {banks.length} bank{banks.length === 1 ? "" : "s"}
            </span>
            <m.span
              className={styles.accordion_chevron}
              animate={{ rotate: open ? 90 : 0 }}
              transition={{ duration: 0.2 }}
            >
              <ChevronRight size={18} />
            </m.span>
          </span>
        </span>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <m.div
            className={styles.accordion_body}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className={styles.accordion_list}>
              {banks.map((bank) => {
                const flow = bankMonthFlow(bank.id, transactions, month);
                const lastMonth =
                  bank.balance -
                  accountMonthDelta(bank.id, transactions, month);
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
                        {revealed ? (
                          <>
                            Last mo {formatCurrency(lastMonth, currency)}
                            {flow.net !== 0 && (
                              <span
                                className={
                                  flow.net > 0 ? styles.row_in : styles.row_out
                                }
                              >
                                {" · "}
                                {flow.net > 0 ? "+" : "-"}
                                {formatCurrency(Math.abs(flow.net), currency)}
                              </span>
                            )}
                          </>
                        ) : (
                          <>
                            Last mo {getCurrencySymbol()}
                            {maskFor(lastMonth)}
                          </>
                        )}
                      </span>
                    </span>
                    <span
                      className={cn(
                        styles.row_amount,
                        bank.balance < 0 && styles["row_amount--neg"],
                      )}
                    >
                      {revealed
                        ? formatCurrency(bank.balance, currency)
                        : `${getCurrencySymbol()}${maskFor(bank.balance)}`}
                    </span>
                  </button>
                );
              })}
            </div>
          </m.div>
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
