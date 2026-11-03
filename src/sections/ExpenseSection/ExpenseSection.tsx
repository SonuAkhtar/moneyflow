"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ChevronDown,
  ChevronRight,
  Plus,
  Receipt,
  TrendingUp,
} from "lucide-react";
import { SortToggle, type SortKey } from "@/components/SortToggle/SortToggle";
import { primeKeyboard } from "@/components/BottomSheet/BottomSheet";
import { EmptyState } from "@/components/EmptyState/EmptyState";
import { ExpenseRow } from "@/components/ExpenseRow/ExpenseRow";
import { AddExpenseSheet } from "@/sections/AddExpenseSheet/AddExpenseSheet";
import { EditTransactionSheet } from "@/sections/EditTransactionSheet/EditTransactionSheet";
import { BankPickerSheet } from "@/sections/BankPickerSheet/BankPickerSheet";
import { useFinanceStore } from "@/store/financeStore";
import { useBalanceTrail } from "@/hooks/useBalanceTrail";
import { cn, currentMonthKey, formatCurrency, monthKey, sumBy } from "@/utils";
import { ROUTES } from "@/constants";
import { computeBudgetStatus } from "@/utils/spendPace";
import type { Transaction } from "@/types";
import styles from "./ExpenseSection.module.scss";

interface ExpenseSectionProps {
  variant: "major" | "daily";
}

const PREVIEW_COUNT = 5;

const byDateDesc = (a: Transaction, b: Transaction) =>
  +new Date(b.occurredAt) - +new Date(a.occurredAt);

export const ExpenseSection = ({ variant }: ExpenseSectionProps) => {
  const isMajor = variant === "major";
  const transactions = useFinanceStore((s) => s.transactions);
  const accounts = useFinanceStore((s) => s.accounts);
  const majorAccountId = useFinanceStore((s) => s.majorAccountId);
  const dailyAccountId = useFinanceStore((s) => s.dailyAccountId);
  const setMajorAccount = useFinanceStore((s) => s.setMajorAccount);
  const setDailyAccount = useFinanceStore((s) => s.setDailyAccount);
  const currency = useFinanceStore((s) => s.profile?.currency ?? "INR");
  const spendBudget = useFinanceStore((s) => s.spendBudget);
  const trail = useBalanceTrail();

  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [draftBank, setDraftBank] = useState("");
  const [sortBy, setSortBy] = useState<SortKey>("amount");

  const accountId = isMajor ? majorAccountId : dailyAccountId;
  const setAccount = isMajor ? setMajorAccount : setDailyAccount;

  const banks = accounts;

  const fallbackBankId =
    accountId ??
    banks[0]?.id ??
    accounts.find((a) => a.isPrimary)?.id ??
    accounts[0]?.id;
  const bank = accounts.find((a) => a.id === fallbackBankId) ?? null;

  const items = useMemo(() => {
    const month = currentMonthKey();
    return transactions
      .filter(
        (t) =>
          t.type === "expense" &&
          t.isBigExpense === isMajor &&
          monthKey(t.occurredAt) === month,
      )
      .sort(
        isMajor && sortBy === "amount"
          ? (a, b) => b.amount - a.amount || byDateDesc(a, b)
          : byDateDesc,
      );
  }, [transactions, isMajor, sortBy]);

  const total = sumBy(items, (t) => t.amount);
  const budgetStatus = useMemo(
    () => (spendBudget ? computeBudgetStatus(spendBudget, transactions) : null),
    [spendBudget, transactions],
  );
  const budgetLeft =
    budgetStatus && (isMajor ? spendBudget?.major : spendBudget?.daily)
      ? isMajor
        ? budgetStatus.majorLeft
        : budgetStatus.todayLeft
      : null;

  const title = isMajor ? "Major expenses" : "Daily expenses";
  const emptyIcon = isMajor ? TrendingUp : Receipt;

  const openPicker = () => {
    setDraftBank(fallbackBankId ?? "");
    setPickerOpen(true);
  };

  const confirmBank = () => {
    if (!draftBank) return;
    setAccount(draftBank);
    setPickerOpen(false);
  };

  return (
    <section data-surface="wallet">
      {isMajor && items.length > 1 && (
        <SortToggle
          value={sortBy}
          onChange={setSortBy}
          label="Sort major expenses"
          className={styles.sort}
        />
      )}

      <div className={styles.card}>
        <div className={styles.card_top}>
          <h3 className={styles.card_kind}>{title}</h3>
          <button
            type="button"
            className={styles.card_add}
            onClick={() => {
              primeKeyboard();
              setSheetOpen(true);
            }}
            aria-label={`Add ${isMajor ? "major" : "daily"} expense`}
          >
            <Plus size={20} strokeWidth={2.4} />
          </button>
        </div>
        <div className={styles.card_body}>
          <div className={styles.card_head}>
            <div className={styles.card_sum}>
              <span className={styles.card_total}>
                {formatCurrency(total, currency)}
              </span>
              <span className={styles.card_caption}>
                {items.length} {items.length === 1 ? "entry" : "entries"}
              </span>
            </div>
            <button
              type="button"
              className={cn(styles.card_field, styles["card_field--end"])}
              onClick={openPicker}
            >
              <span className={styles.card_label}>Bank</span>
              <span className={styles.card_value}>
                <span className={styles.card_bank}>
                  {bank?.name ?? "Choose bank"}
                </span>
                <ChevronDown size={14} />
              </span>
            </button>
          </div>
          {budgetLeft !== null && (
            <div className={styles.card_meta}>
              <div className={styles.card_field}>
                <span className={styles.card_label}>
                  {isMajor ? "Left this month" : "Left today"}
                </span>
                <span className={styles.card_value}>
                  {formatCurrency(Math.abs(budgetLeft), currency)}
                  {budgetLeft < 0 && " over"}
                </span>
              </div>
            </div>
          )}
          <div className={styles.card_list}>
            {items.length === 0 ? (
              <EmptyState
                icon={emptyIcon}
                title={isMajor ? "No major spends yet" : "Nothing logged yet"}
                description={
                  isMajor
                    ? "Log a big purchase to keep an eye on it."
                    : "Track everyday spends to stay in control."
                }
              />
            ) : (
              <div className={styles.rows}>
                {items.map((transaction) => (
                  <ExpenseRow
                    key={transaction.id}
                    transaction={transaction}
                    currency={currency}
                    balance={trail.get(transaction.id)}
                    onClick={setEditing}
                  />
                ))}
              </div>
            )}
            {items.length > PREVIEW_COUNT && (
              <div className={styles.foot}>
                <Link
                  href={`${ROUTES.transactions}?kind=${variant}`}
                  className={styles.seeAll}
                >
                  See all {items.length}
                  <ChevronRight size={15} />
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      <AddExpenseSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title={`Add ${isMajor ? "major" : "daily"} expense`}
        big={isMajor}
        accountId={bank?.id}
      />
      <EditTransactionSheet
        transaction={editing}
        open={editing !== null}
        onClose={() => setEditing(null)}
      />
      <BankPickerSheet
        open={pickerOpen}
        title={`${title} bank`}
        banks={banks}
        value={draftBank}
        currency={currency}
        onChange={setDraftBank}
        onConfirm={confirmBank}
        onClose={() => setPickerOpen(false)}
      />
    </section>
  );
};
