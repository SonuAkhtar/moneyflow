"use client";

import { useState } from "react";
import { BottomSheet } from "@/components/BottomSheet/BottomSheet";
import { Input } from "@/components/Input/Input";
import { Select } from "@/components/Select/Select";
import { Button } from "@/components/Button/Button";
import { CategoryPicker } from "@/components/CategoryPicker/CategoryPicker";
import { useFinanceStore } from "@/store/financeStore";
import { useSpendAccounts } from "@/hooks/useSpendAccounts";
import { useToast } from "@/hooks/useToast";
import { AmountField } from "@/components/AmountField/AmountField";
import { formatCurrency, getCurrencySymbol } from "@/utils";
import { QUICK_EXPENSE_CATEGORIES } from "@/constants";
import type { CategoryId } from "@/types";
import styles from "./AddExpenseSheet.module.scss";

interface AddExpenseSheetProps {
  open: boolean;
  onClose: () => void;
  title: string;
  big?: boolean;
  defaultCategory?: CategoryId;
  accountId?: string;
}

const today = () => new Date().toISOString().slice(0, 10);

export const AddExpenseSheet = ({
  open,
  onClose,
  title,
  big = false,
  defaultCategory = "food",
  accountId,
}: AddExpenseSheetProps) => {
  const currency = useFinanceStore((s) => s.profile?.currency ?? "INR");
  const addTransaction = useFinanceStore((s) => s.addTransaction);
  const { banks, defaultBankId, resolve } = useSpendAccounts(accountId);
  const toast = useToast();
  const symbol = getCurrencySymbol();

  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState<CategoryId>(defaultCategory);
  const [bankId, setBankId] = useState(defaultBankId);
  const [merchant, setMerchant] = useState("");
  const [date, setDate] = useState(today());

  const canSave = Number(amount) > 0 && Boolean(resolve(bankId));

  const submit = () => {
    const value = Number(amount);
    const account = resolve(bankId);
    if (!value || !account) return;
    addTransaction({
      accountId: account.id,
      type: "expense",
      amount: value,
      category,
      merchant: merchant || undefined,
      isBigExpense: big,
      occurredAt: new Date(date).toISOString(),
    });
    toast({ title: "Expense added", description: `${symbol}${value}`, variant: "success" });
    setAmount("");
    setMerchant("");
    setCategory(defaultCategory);
    setBankId(defaultBankId);
    setDate(today());
    onClose();
  };

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title={title}
      footer={
        <Button size="lg" fullWidth onClick={submit} disabled={!canSave}>
          Add expense
        </Button>
      }
    >
      <div className={styles.form}>
        <AmountField value={amount} onChange={setAmount} symbol={symbol} />


        <div className={styles.field}>
          <span className={styles.label}>Category</span>
          <CategoryPicker
            categories={QUICK_EXPENSE_CATEGORIES}
            value={category}
            onChange={setCategory}
          />
        </div>

        <Select
          label="Bank"
          value={bankId}
          onChange={(e) => setBankId(e.target.value)}
          options={banks.map((a) => ({
            label: `${a.name} · ${formatCurrency(a.balance, currency)}`,
            value: a.id,
          }))}
        />

        {big ? (
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
      </div>
    </BottomSheet>
  );
};
