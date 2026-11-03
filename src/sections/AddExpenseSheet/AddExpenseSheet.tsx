"use client";

import { useId, useRef, useState } from "react";
import { BottomSheet } from "@/components/BottomSheet/BottomSheet";
import { Input } from "@/components/Input/Input";
import { DateField } from "@/components/DateField/DateField";
import { Select } from "@/components/Select/Select";
import { Button } from "@/components/Button/Button";
import { CategoryPicker } from "@/components/CategoryPicker/CategoryPicker";
import { useFinanceStore } from "@/store/financeStore";
import { useSpendAccounts } from "@/hooks/useSpendAccounts";
import { useToast } from "@/hooks/useToast";
import { AmountField } from "@/components/AmountField/AmountField";
import {
  accountLabel,
  currentDateKey,
  dateInputToIso,
  formatCurrency,
  getCurrencySymbol,
} from "@/utils";
import {
  DAILY_EXPENSE_CATEGORIES,
  MAJOR_EXPENSE_CATEGORIES,
} from "@/constants";
import { BudgetImpact } from "@/sections/BudgetImpact/BudgetImpact";
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

export const AddExpenseSheet = ({
  open,
  onClose,
  title,
  big = false,
  defaultCategory = "food",
  accountId,
}: AddExpenseSheetProps) => (
  <BottomSheet open={open} onClose={onClose} title={title}>
    {open && (
      <ExpenseForm
        key={`${accountId ?? "none"}-${defaultCategory}`}
        onClose={onClose}
        big={big}
        defaultCategory={defaultCategory}
        accountId={accountId}
      />
    )}
  </BottomSheet>
);

interface ExpenseFormProps {
  onClose: () => void;
  big: boolean;
  defaultCategory: CategoryId;
  accountId?: string;
}

const ExpenseForm = ({
  onClose,
  big,
  defaultCategory,
  accountId,
}: ExpenseFormProps) => {
  const currency = useFinanceStore((s) => s.profile?.currency ?? "INR");
  const addTransaction = useFinanceStore((s) => s.addTransaction);
  const { banks, defaultBankId, resolve } = useSpendAccounts(accountId);
  const toast = useToast();
  const symbol = getCurrencySymbol();

  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState<CategoryId>(defaultCategory);
  const [bankId, setBankId] = useState(defaultBankId);
  const [merchant, setMerchant] = useState("");
  const [date, setDate] = useState(currentDateKey());
  const submitted = useRef(false);
  const hintId = useId();
  const categoryLabelId = useId();

  const value = Number(amount);
  const categories = big ? MAJOR_EXPENSE_CATEGORIES : DAILY_EXPENSE_CATEGORIES;

  const account = resolve(bankId);
  const blocker =
    banks.length === 0
      ? "Add a bank on the Savings tab first."
      : !account
        ? "Pick a bank to pay from."
        : !(value > 0)
          ? "Enter an amount to continue."
          : null;

  const showHint = blocker !== null && (value > 0 || banks.length === 0);

  const submit = () => {
    if (blocker || !account || submitted.current) return;
    submitted.current = true;
    addTransaction({
      accountId: account.id,
      type: "expense",
      amount: value,
      category: category,
      merchant: (big && merchant.trim()) || undefined,
      isBigExpense: big,
      occurredAt: dateInputToIso(date),
    });
    toast({
      title: big ? "Major expense added" : "Expense added",
      description: formatCurrency(value, currency),
      variant: "success",
    });
    onClose();
  };

  return (
    <form
      className={styles.form}
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <AmountField
        value={amount}
        onChange={setAmount}
        symbol={symbol}
        autoFocus
        aria-label="Expense amount"
        aria-describedby={showHint ? hintId : undefined}
      />

      <BudgetImpact
        draft={{
          type: "expense",
          amount: value || 0,
          category: category,
          isBigExpense: big,
          occurredAt: dateInputToIso(date),
        }}
      />

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

      {big && (
        <Input
          label="Merchant (optional)"
          placeholder="Where did you spend?"
          value={merchant}
          maxLength={80}
          onChange={(e) => setMerchant(e.target.value)}
        />
      )}

      <DateField value={date} onChange={setDate} max={currentDateKey()} />

      <Select
        label="Bank"
        value={bankId}
        onChange={(e) => setBankId(e.target.value)}
        options={banks.map((a) => ({
          label: accountLabel(a, currency),
          value: a.id,
        }))}
      />

      {showHint && (
        <p id={hintId} className={styles.hint} role="status">
          {blocker}
        </p>
      )}

      <Button type="submit" size="lg" fullWidth disabled={blocker !== null}>
        Add expense
      </Button>
    </form>
  );
};
