"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { BottomSheet } from "@/components/BottomSheet/BottomSheet";
import { Input } from "@/components/Input/Input";
import { Select } from "@/components/Select/Select";
import { Button } from "@/components/Button/Button";
import { AmountField } from "@/components/AmountField/AmountField";
import { CategoryPicker } from "@/components/CategoryPicker/CategoryPicker";
import { ConfirmDialog } from "@/components/ConfirmDialog/ConfirmDialog";
import { useFinanceStore } from "@/store/financeStore";
import { useSpendAccounts } from "@/hooks/useSpendAccounts";
import { useToast } from "@/hooks/useToast";
import { dateInputToIso, formatCurrency, getCurrencySymbol } from "@/utils";
import type { CategoryId, Transaction } from "@/types";
import styles from "./AddIncomeSheet.module.scss";

const INCOME_CATEGORIES: CategoryId[] = ["investment", "other"];

const today = () => new Date().toISOString().slice(0, 10);

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
    transaction ? transaction.occurredAt.slice(0, 10) : today(),
  );
  const [confirmOpen, setConfirmOpen] = useState(false);

  const canSave = Number(amount) > 0 && Boolean(resolve(bankId));

  const save = () => {
    const value = Number(amount);
    const account = resolve(bankId);
    if (!value || !account) return;
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
        description: `${symbol}${value}`,
        variant: "success",
      });
    } else {
      addTransaction(input);
      toast({
        title: "Income added",
        description: `${symbol}${value}`,
        variant: "success",
      });
    }
    onClose();
  };

  const confirmDelete = () => {
    if (!transaction) return;
    deleteTransaction(transaction.id);
    toast({ title: "Income deleted", variant: "info" });
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
          label: `${a.name} · ${formatCurrency(a.balance, currency)}`,
          value: a.id,
        }))}
      />

      <Input
        label="Date"
        type="date"
        max={today()}
        value={date}
        onChange={(e) => setDate(e.target.value)}
      />

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
