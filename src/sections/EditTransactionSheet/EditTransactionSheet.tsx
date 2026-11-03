"use client";

import { useId, useRef, useState } from "react";
import { Trash2 } from "lucide-react";
import { BottomSheet } from "@/components/BottomSheet/BottomSheet";
import { Input } from "@/components/Input/Input";
import { Button } from "@/components/Button/Button";
import { AmountField } from "@/components/AmountField/AmountField";
import { DateField } from "@/components/DateField/DateField";
import { CategoryPicker } from "@/components/CategoryPicker/CategoryPicker";
import { ConfirmDialog } from "@/components/ConfirmDialog/ConfirmDialog";
import { useFinanceStore } from "@/store/financeStore";
import { useToast } from "@/hooks/useToast";
import {
  currentDateKey,
  dateInputToIso,
  dateKey,
  formatCurrency,
  getCurrencySymbol,
  SAVINGS_WITHDRAWAL_NOTE,
  transactionDelta,
} from "@/utils";
import { BudgetImpact } from "@/sections/BudgetImpact/BudgetImpact";
import {
  DAILY_EXPENSE_CATEGORIES,
  MAJOR_EXPENSE_CATEGORIES,
} from "@/constants";
import type { CategoryId, Transaction } from "@/types";
import styles from "./EditTransactionSheet.module.scss";

interface EditTransactionSheetProps {
  transaction: Transaction | null;
  open: boolean;
  onClose: () => void;
}

const nounOf = (t: Transaction | null) => {
  if (t?.type === "income") return "Income";
  if (t?.type === "transfer")
    return t.note === SAVINGS_WITHDRAWAL_NOTE
      ? "Savings withdrawal"
      : "Savings deposit";
  return "Expense";
};

export const EditTransactionSheet = ({
  transaction,
  open,
  onClose,
}: EditTransactionSheetProps) => {
  const [shown, setShown] = useState(transaction);
  const [wasOpen, setWasOpen] = useState(false);
  const [session, setSession] = useState(0);
  if (transaction && transaction !== shown) setShown(transaction);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) setSession((n) => n + 1);
  }
  const current = transaction ?? shown;

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title={`Edit ${nounOf(current).toLowerCase()}`}
    >
      {current && (
        <EditForm key={session} transaction={current} onClose={onClose} />
      )}
    </BottomSheet>
  );
};

const dateValue = (iso: string) => dateKey(iso);

interface EditFormProps {
  transaction: Transaction;
  onClose: () => void;
}

const EditForm = ({ transaction, onClose }: EditFormProps) => {
  const updateTransaction = useFinanceStore((s) => s.updateTransaction);
  const deleteTransaction = useFinanceStore((s) => s.deleteTransaction);
  const restoreTransaction = useFinanceStore((s) => s.restoreTransaction);
  const currency = useFinanceStore((s) => s.profile?.currency ?? "INR");
  const toast = useToast();
  const symbol = getCurrencySymbol();
  const noun = nounOf(transaction);
  const today = currentDateKey();
  const categoryLabelId = useId();

  const [amount, setAmount] = useState(String(transaction.amount));
  const [category, setCategory] = useState<CategoryId>(transaction.category);
  const [merchant, setMerchant] = useState(transaction.merchant ?? "");
  const [date, setDate] = useState(dateValue(transaction.occurredAt));
  const [confirmOpen, setConfirmOpen] = useState(false);
  const submitted = useRef(false);

  const value = Number(amount);
  const canSave = value > 0;
  const occurredAt =
    date === dateValue(transaction.occurredAt)
      ? transaction.occurredAt
      : dateInputToIso(date);

  const save = () => {
    if (!canSave || submitted.current) return;
    submitted.current = true;
    updateTransaction(transaction.id, {
      accountId: transaction.accountId,
      type: transaction.type,
      amount: value,
      category,
      merchant: merchant || undefined,
      isBigExpense: transaction.isBigExpense,
      occurredAt,
    });
    toast({
      title: `${noun} updated`,
      description: formatCurrency(value, currency),
      variant: "success",
    });
    onClose();
  };

  const confirmDelete = () => {
    deleteTransaction(transaction.id);
    toast({
      title: `${noun} deleted`,
      description: formatCurrency(transaction.amount, currency),
      variant: "info",
      action: {
        label: "Undo",
        onClick: () => restoreTransaction(transaction),
      },
    });
    setConfirmOpen(false);
    onClose();
  };

  const kindCategories = transaction.isBigExpense
    ? MAJOR_EXPENSE_CATEGORIES
    : DAILY_EXPENSE_CATEGORIES;
  const categories = kindCategories.includes(transaction.category)
    ? kindCategories
    : [transaction.category, ...kindCategories];

  return (
    <div className={styles.form}>
      <AmountField value={amount} onChange={setAmount} symbol={symbol} />

      {transaction.type === "expense" && (
        <BudgetImpact
          replaceId={transaction.id}
          draft={{
            type: "expense",
            amount: value || 0,
            category,
            isBigExpense: transaction.isBigExpense,
            occurredAt,
          }}
        />
      )}

      {transaction.type === "expense" && (
        <div className={styles.field}>
          <span id={categoryLabelId} className={styles.label}>
            Category
          </span>
          <CategoryPicker
            labelledBy={categoryLabelId}
            categories={categories}
            value={category}
            onChange={setCategory}
          />
        </div>
      )}

      {transaction.type === "expense" && transaction.isBigExpense && (
        <Input
          label="Merchant (optional)"
          placeholder="Where did you spend?"
          value={merchant}
          maxLength={80}
          onChange={(e) => setMerchant(e.target.value)}
        />
      )}

      <DateField value={date} onChange={setDate} max={today} />

      <div className={styles.actions}>
        <button
          type="button"
          className={styles.delete}
          onClick={() => setConfirmOpen(true)}
          aria-label={`Delete ${noun.toLowerCase()}`}
        >
          <Trash2 size={18} />
        </button>
        <Button
          size="lg"
          className={styles.save}
          onClick={save}
          disabled={!canSave}
        >
          Save changes
        </Button>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        title={`Delete this ${noun.toLowerCase()}?`}
        message={
          transactionDelta(transaction) > 0
            ? "This will remove the entry and subtract the amount from your account balance."
            : "This will remove the entry and add the amount back to your account balance."
        }
        confirmLabel="Delete"
        onConfirm={confirmDelete}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  );
};
