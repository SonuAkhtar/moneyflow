"use client";

import { useState } from "react";
import { BottomSheet } from "@/components/BottomSheet/BottomSheet";
import { Input } from "@/components/Input/Input";
import { DateField } from "@/components/DateField/DateField";
import { SegmentedControl } from "@/components/SegmentedControl/SegmentedControl";
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
import { BIG_EXPENSE_THRESHOLD, QUICK_EXPENSE_CATEGORIES } from "@/constants";
import type { CategoryId } from "@/types";
import styles from "./AddExpenseSheet.module.scss";

interface AddExpenseSheetProps {
  open: boolean;
  onClose: () => void;
  title: string;
  big?: boolean;
  defaultCategory?: CategoryId;
  accountId?: string;
  kindSelectable?: boolean;
}

type Kind = "daily" | "major";

export const AddExpenseSheet = ({
  open,
  onClose,
  title,
  big = false,
  defaultCategory = "food",
  accountId,
  kindSelectable = false,
}: AddExpenseSheetProps) => (
  <BottomSheet open={open} onClose={onClose} title={title}>
    {open && (
      <ExpenseForm
        key={`${accountId ?? "none"}-${defaultCategory}`}
        onClose={onClose}
        big={big}
        defaultCategory={defaultCategory}
        accountId={accountId}
        kindSelectable={kindSelectable}
      />
    )}
  </BottomSheet>
);

interface ExpenseFormProps {
  onClose: () => void;
  big: boolean;
  defaultCategory: CategoryId;
  accountId?: string;
  kindSelectable: boolean;
}

const ExpenseForm = ({
  onClose,
  big,
  defaultCategory,
  accountId,
  kindSelectable,
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
  const [chosenKind, setChosenKind] = useState<Kind | null>(null);

  const value = Number(amount);
  const suggestedKind: Kind =
    value > BIG_EXPENSE_THRESHOLD ? "major" : big ? "major" : "daily";
  const kind: Kind = kindSelectable
    ? (chosenKind ?? suggestedKind)
    : big
      ? "major"
      : "daily";

  const account = resolve(bankId);
  const blocker =
    banks.length === 0
      ? "Add a bank on the Savings tab first."
      : !account
        ? "Pick a bank to pay from."
        : !(value > 0)
          ? "Enter an amount to continue."
          : null;

  const submit = () => {
    if (blocker || !account) return;
    addTransaction({
      accountId: account.id,
      type: "expense",
      amount: value,
      category,
      merchant: merchant.trim() || undefined,
      isBigExpense: kind === "major",
      occurredAt: dateInputToIso(date),
    });
    toast({
      title: kind === "major" ? "Major expense added" : "Expense added",
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
      />

      {kindSelectable && (
        <div className={styles.field}>
          <span className={styles.label} id="expense-kind-label">
            Type
          </span>
          <SegmentedControl<Kind>
            className={styles.kind}
            aria-labelledby="expense-kind-label"
            segments={[
              { label: "Daily", value: "daily" },
              { label: "Major", value: "major" },
            ]}
            value={kind}
            onChange={setChosenKind}
            size="sm"
          />
        </div>
      )}

      <div className={styles.field}>
        <span className={styles.label}>Category</span>
        <CategoryPicker
          categories={QUICK_EXPENSE_CATEGORIES}
          value={category}
          onChange={setCategory}
        />
      </div>

      <Input
        label="Merchant (optional)"
        placeholder="Where did you spend?"
        value={merchant}
        maxLength={80}
        onChange={(e) => setMerchant(e.target.value)}
      />

      <DateField value={date} onChange={setDate} />

      <Select
        label="Bank"
        value={bankId}
        onChange={(e) => setBankId(e.target.value)}
        options={banks.map((a) => ({
          label: accountLabel(a, currency),
          value: a.id,
        }))}
      />

      {blocker && (value > 0 || banks.length === 0) && (
        <p className={styles.hint} role="status">
          {blocker}
        </p>
      )}

      <Button type="submit" size="lg" fullWidth disabled={blocker !== null}>
        Add expense
      </Button>
    </form>
  );
};
