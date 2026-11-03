"use client";

import { useRef, useState } from "react";
import { Trash2 } from "lucide-react";
import { BottomSheet } from "@/components/BottomSheet/BottomSheet";
import { Input } from "@/components/Input/Input";
import { Select } from "@/components/Select/Select";
import { Button } from "@/components/Button/Button";
import { AmountField } from "@/components/AmountField/AmountField";
import { DateField } from "@/components/DateField/DateField";
import { CategoryPicker } from "@/components/CategoryPicker/CategoryPicker";
import { ConfirmDialog } from "@/components/ConfirmDialog/ConfirmDialog";
import { useFinanceStore } from "@/store/financeStore";
import { useSpendAccounts } from "@/hooks/useSpendAccounts";
import { useToast } from "@/hooks/useToast";
import {
  accountLabel,
  currentDateKey,
  dateInputToIso,
  dateKey,
  formatCurrency,
  getCurrencySymbol,
} from "@/utils";
import type { CategoryId, Transaction } from "@/types";
import styles from "./AddIncomeSheet.module.scss";

const INCOME_CATEGORIES: CategoryId[] = ["investment", "other"];

const today = currentDateKey;

interface AddIncomeSheetProps {
  open: boolean;
  onClose: () => void;
  transaction?: Transaction | null;
}

export const AddIncomeSheet = ({
  open,
  onClose,
  transaction = null,
}: AddIncomeSheetProps) => (
  <BottomSheet
    open={open}
    onClose={onClose}
    title={transaction ? "Edit income" : "Add income"}
  >
    {open && (
      <Form
        key={transaction?.id ?? "new"}
        transaction={transaction}
        onClose={onClose}
      />
    )}
  </BottomSheet>
);

interface FormProps {
  transaction: Transaction | null;
  onClose: () => void;
}

const Form = ({ transaction, onClose }: FormProps) => {
  const currency = useFinanceStore((s) => s.profile?.currency ?? "INR");
  const addTransaction = useFinanceStore((s) => s.addTransaction);
  const updateTransaction = useFinanceStore((s) => s.updateTransaction);
  const deleteTransaction = useFinanceStore((s) => s.deleteTransaction);
  const restoreTransaction = useFinanceStore((s) => s.restoreTransaction);
  const { banks, defaultBankId, resolve } = useSpendAccounts(
    transaction?.accountId,
  );
  const toast = useToast();
  const symbol = getCurrencySymbol();

  const [amount, setAmount] = useState(
    transaction ? String(transaction.amount) : "",
  );
  const [category, setCategory] = useState<CategoryId>(
    transaction?.category ?? "other",
  );
  const [note, setNote] = useState(transaction?.note ?? "");
  const [bankId, setBankId] = useState(defaultBankId);
  const [date, setDate] = useState(
    transaction ? dateKey(transaction.occurredAt) : today(),
  );
  const [confirmOpen, setConfirmOpen] = useState(false);
  const submitted = useRef(false);

  const canSave = Number(amount) > 0 && Boolean(resolve(bankId));

  const save = () => {
    const value = Number(amount);
    const account = resolve(bankId);
    if (!value || !account || submitted.current) return;
    submitted.current = true;
    const input = {
      accountId: account.id,
      type: "income" as const,
      amount: value,
      category,
      note,
      occurredAt: dateInputToIso(date),
    };
    if (transaction) {
      updateTransaction(transaction.id, input);
      toast({
        title: "Income updated",
        description: formatCurrency(value, currency),
        variant: "success",
      });
    } else {
      addTransaction(input);
      toast({
        title: "Income added",
        description: formatCurrency(value, currency),
        variant: "success",
      });
    }
    onClose();
  };

  const confirmDelete = () => {
    if (!transaction) return;
    deleteTransaction(transaction.id);
    toast({
      title: "Income deleted",
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

  return (
    <div className={styles.form}>
      <AmountField
        value={amount}
        onChange={setAmount}
        symbol={symbol}
        tone="success"
      />

      <div className={styles.field}>
        <span className={styles.label}>Type</span>
        <CategoryPicker
          categories={INCOME_CATEGORIES}
          value={category}
          onChange={setCategory}
        />
      </div>

      <Input
        label="Note"
        placeholder="e.g. Freelance, refund, bonus"
        value={note}
        onChange={(e) => setNote(e.target.value)}
      />

      <Select
        label="Deposit to"
        value={bankId}
        onChange={(e) => setBankId(e.target.value)}
        options={banks.map((a) => ({
          label: accountLabel(a, currency),
          value: a.id,
        }))}
      />

      <DateField value={date} onChange={setDate} max={today()} />

      {transaction ? (
        <div className={styles.actions}>
          <button
            type="button"
            className={styles.delete}
            onClick={() => setConfirmOpen(true)}
            aria-label="Delete income"
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
      ) : (
        <Button size="lg" fullWidth onClick={save} disabled={!canSave}>
          Add income
        </Button>
      )}

      <ConfirmDialog
        open={confirmOpen}
        title="Delete this income?"
        message="This will remove the entry and subtract the amount from your account balance."
        confirmLabel="Delete"
        onConfirm={confirmDelete}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  );
};
