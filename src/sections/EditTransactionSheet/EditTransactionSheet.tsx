"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { BottomSheet } from "@/components/BottomSheet/BottomSheet";
import { Input } from "@/components/Input/Input";
import { Button } from "@/components/Button/Button";
import { AmountField } from "@/components/AmountField/AmountField";
import { CategoryPicker } from "@/components/CategoryPicker/CategoryPicker";
import { ConfirmDialog } from "@/components/ConfirmDialog/ConfirmDialog";
import { useFinanceStore } from "@/store/financeStore";
import { useToast } from "@/hooks/useToast";
import { getCurrencySymbol } from "@/utils";
import { QUICK_EXPENSE_CATEGORIES } from "@/constants";
import type { CategoryId, Transaction } from "@/types";
import styles from "./EditTransactionSheet.module.scss";

interface EditTransactionSheetProps {
  transaction: Transaction | null;
  open: boolean;
  onClose: () => void;
}

export const EditTransactionSheet = ({
  transaction,
  open,
  onClose,
}: EditTransactionSheetProps) => (
  <BottomSheet
    open={open}
    onClose={onClose}
    title={transaction?.type === "income" ? "Edit income" : "Edit expense"}
  >
    {transaction && (
      <EditForm
        key={transaction.id}
        transaction={transaction}
        onClose={onClose}
      />
    )}
  </BottomSheet>
);

const dateValue = (iso: string) => iso.slice(0, 10);

interface EditFormProps {
  transaction: Transaction;
  onClose: () => void;
}

const EditForm = ({ transaction, onClose }: EditFormProps) => {
  const updateTransaction = useFinanceStore((s) => s.updateTransaction);
  const deleteTransaction = useFinanceStore((s) => s.deleteTransaction);
  const toast = useToast();
  const symbol = getCurrencySymbol();

  const [amount, setAmount] = useState(String(transaction.amount));
  const [category, setCategory] = useState<CategoryId>(transaction.category);
  const [merchant, setMerchant] = useState(transaction.merchant ?? "");
  const [date, setDate] = useState(dateValue(transaction.occurredAt));
  const [confirmOpen, setConfirmOpen] = useState(false);

  const value = Number(amount);
  const canSave = value > 0;

  const save = () => {
    if (!canSave) return;
    updateTransaction(transaction.id, {
      accountId: transaction.accountId,
      type: transaction.type,
      amount: value,
      category,
      merchant: merchant || undefined,
      isBigExpense: transaction.isBigExpense,
      occurredAt: new Date(date).toISOString(),
    });
    toast({
      title: "Expense updated",
      description: `${symbol}${value}`,
      variant: "success",
    });
    onClose();
  };

  const confirmDelete = () => {
    deleteTransaction(transaction.id);
    toast({ title: "Expense deleted", variant: "info" });
    setConfirmOpen(false);
    onClose();
  };

  return (
    <div className={styles.form}>
      <AmountField value={amount} onChange={setAmount} symbol={symbol} />

      {transaction.type === "expense" && (
        <div className={styles.field}>
          <span className={styles.label}>Category</span>
          <CategoryPicker
            categories={QUICK_EXPENSE_CATEGORIES}
            value={category}
            onChange={setCategory}
          />
        </div>
      )}

      {transaction.type === "expense" && transaction.isBigExpense ? (
        <div className={styles.row}>
          <Input
            label="Merchant"
            placeholder="Where?"
            value={merchant}
            onChange={(e) => setMerchant(e.target.value)}
          />
          <Input
            label="Date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>
      ) : (
        <Input
          label="Date"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
      )}

      <div className={styles.actions}>
        <button
          type="button"
          className={styles.delete}
          onClick={() => setConfirmOpen(true)}
          aria-label="Delete expense"
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
        title="Delete this expense?"
        message="This will remove the entry and restore the amount to your account balance."
        confirmLabel="Delete"
        onConfirm={confirmDelete}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  );
};
