"use client";

import { useMemo, useState } from "react";
import { Building2, ChevronDown, Plus, Receipt, TrendingUp } from "lucide-react";
import { Card } from "@/components/Card/Card";
import { EmptyState } from "@/components/EmptyState/EmptyState";
import { ExpenseRow } from "@/components/ExpenseRow/ExpenseRow";
import { AddExpenseSheet } from "@/sections/AddExpenseSheet/AddExpenseSheet";
import { EditTransactionSheet } from "@/sections/EditTransactionSheet/EditTransactionSheet";
import { BankPickerSheet } from "@/sections/BankPickerSheet/BankPickerSheet";
import { useFinanceStore } from "@/store/financeStore";
import { useBalanceTrail } from "@/hooks/useBalanceTrail";
import { currentMonthKey, formatCurrency, monthKey, sumBy } from "@/utils";
import type { CategoryId, Transaction } from "@/types";
import styles from "./ExpenseSection.module.scss";

interface ExpenseSectionProps {
  variant: "major" | "daily";
}

export const ExpenseSection = ({ variant }: ExpenseSectionProps) => {
  const isMajor = variant === "major";
  const transactions = useFinanceStore((s) => s.transactions);
  const accounts = useFinanceStore((s) => s.accounts);
  const majorAccountId = useFinanceStore((s) => s.majorAccountId);
  const dailyAccountId = useFinanceStore((s) => s.dailyAccountId);
  const setMajorAccount = useFinanceStore((s) => s.setMajorAccount);
  const setDailyAccount = useFinanceStore((s) => s.setDailyAccount);
  const currency = useFinanceStore((s) => s.profile?.currency ?? "INR");
  const trail = useBalanceTrail();

  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [draftBank, setDraftBank] = useState("");

  const accountId = isMajor ? majorAccountId : dailyAccountId;
  const setAccount = isMajor ? setMajorAccount : setDailyAccount;

  const banks = useMemo(
    () => accounts.filter((a) => a.type === "savings"),
    [accounts],
  );

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
      .sort((a, b) => +new Date(b.occurredAt) - +new Date(a.occurredAt));
  }, [transactions, isMajor]);

  const total = sumBy(items, (t) => t.amount);

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
      <div className={styles.head}>
        <div className={styles.head_top}>
          <h3 className={styles.head_title}>{title}</h3>
          <span className={styles.head_total}>
            {total > 0 ? `-${formatCurrency(total, currency)}` : formatCurrency(0, currency)}
          </span>
        </div>
        <div className={styles.head_meta}>
          <button type="button" className={styles.bankchip} onClick={openPicker}>
            <Building2 size={13} />
            <span className={styles.bankchip_name}>{bank?.name ?? "Choose bank"}</span>
            <ChevronDown size={13} />
          </button>
          <span className={styles.head_count}>
            {items.length} this month
          </span>
        </div>
      </div>

      <Card surface="solid" padded={false} className={styles.list}>
        {items.length === 0 ? (
          <EmptyState
            icon={emptyIcon}
            title={isMajor ? "No major spends yet" : "Nothing logged yet"}
            description={
              isMajor
                ? "Log a big purchase to keep an eye on it."
                : "Track everyday spends to stay on budget."
            }
          />
        ) : (
          <div className={styles.scroll}>
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
        <button
          type="button"
          className={styles.fab}
          onClick={() => setSheetOpen(true)}
          aria-label={`Add ${isMajor ? "major" : "daily"} expense`}
        >
          <Plus size={15} />
          Add
        </button>
      </Card>

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
