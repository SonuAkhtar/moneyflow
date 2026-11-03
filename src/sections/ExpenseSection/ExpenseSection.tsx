"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { m } from "framer-motion";
import {
  CalendarDays,
  ChevronDown,
  ChevronRight,
  IndianRupee,
  Plus,
  Receipt,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";
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
import type { CategoryId, Transaction } from "@/types";
import styles from "./ExpenseSection.module.scss";

interface ExpenseSectionProps {
  variant: "major" | "daily";
}

type SortKey = "amount" | "date";

const SORT_OPTIONS: { value: SortKey; label: string; icon: LucideIcon }[] = [
  { value: "amount", label: "Sort by amount", icon: IndianRupee },
  { value: "date", label: "Sort by date", icon: CalendarDays },
];

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
  const defaultCategory: CategoryId = isMajor ? "shopping" : "food";

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
        <div
          className={styles.sort}
          role="group"
          aria-label="Sort major expenses"
        >
          {SORT_OPTIONS.map((option) => {
            const active = sortBy === option.value;
            return (
              <button
                key={option.value}
                type="button"
                className={cn(
                  styles.sort_item,
                  active && styles["sort_item--active"],
                )}
                aria-pressed={active}
                aria-label={option.label}
                title={option.label}
                onClick={() => setSortBy(option.value)}
              >
                {active && (
                  <m.span
                    layoutId={`sort-pill-${variant}`}
                    className={styles.sort_pill}
                    transition={{
                      type: "spring",
                      stiffness: 520,
                      damping: 36,
                    }}
                  />
                )}
                <option.icon size={15} className={styles.sort_icon} />
              </button>
            );
          })}
        </div>
      )}

      <div className={styles.card}>
        <div className={styles.card_top}>
          <h3 className={styles.card_kind}>
            {isMajor ? "Major" : "Daily"}
            <span className="sr-only"> expenses</span>
          </h3>
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
          <span className={styles.card_total}>
            {formatCurrency(total, currency)}
          </span>
          <span className={styles.card_caption}>
            Spent this month · {items.length}{" "}
            {items.length === 1 ? "entry" : "entries"}
          </span>
          <div className={styles.card_meta}>
            <button
              type="button"
              className={styles.card_field}
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
            {budgetLeft !== null && (
              <div className={cn(styles.card_field, styles["card_field--end"])}>
                <span className={styles.card_label}>
                  {isMajor ? "Left this month" : "Left today"}
                </span>
                <span className={styles.card_value}>
                  {formatCurrency(Math.abs(budgetLeft), currency)}
                  {budgetLeft < 0 && " over"}
                </span>
              </div>
            )}
          </div>
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
        defaultCategory={defaultCategory}
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
