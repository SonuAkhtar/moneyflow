"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Sparkles } from "lucide-react";
import { Input } from "@/components/Input/Input";
import { Select } from "@/components/Select/Select";
import { Textarea } from "@/components/Textarea/Textarea";
import { Button } from "@/components/Button/Button";
import { SegmentedControl } from "@/components/SegmentedControl/SegmentedControl";
import { CategoryPicker } from "@/components/CategoryPicker/CategoryPicker";
import { useFinanceStore } from "@/store/financeStore";
import { useToast } from "@/hooks/useToast";
import { transactionSchema, type TransactionValues } from "@/utils/validation";
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from "@/constants/categories";
import { getCurrencySymbol } from "@/utils";
import type { CategoryId, TransactionType } from "@/types";
import styles from "./TransactionForm.module.scss";

interface TransactionFormProps {
  onSuccess?: () => void;
}

export const TransactionForm = ({ onSuccess }: TransactionFormProps) => {
  const accounts = useFinanceStore((s) => s.accounts);
  const addTransaction = useFinanceStore((s) => s.addTransaction);
  const toast = useToast();
  const symbol = getCurrencySymbol();

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<TransactionValues>({
    resolver: zodResolver(transactionSchema),
    defaultValues: {
      type: "expense",
      category: "food",
      accountId: accounts[0]?.id ?? "",
      amount: undefined,
      note: "",
      merchant: "",
      isBigExpense: false,
      occurredAt: new Date().toISOString().slice(0, 10),
    },
  });

  const type = watch("type") as TransactionType;
  const category = watch("category") as CategoryId;
  const categoryList = type === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  const submit = handleSubmit((values) => {
    addTransaction({
      ...values,
      category: values.category as CategoryId,
      occurredAt: new Date(values.occurredAt).toISOString(),
    });
    toast({
      title: type === "income" ? "Income added" : "Expense logged",
      description: `${symbol}${values.amount} • ${values.merchant || "moneyFlow"}`,
      variant: "success",
    });
    reset();
    onSuccess?.();
  });

  return (
    <form className={styles.form} onSubmit={submit}>
      <SegmentedControl<TransactionType>
        segments={[
          { label: "Expense", value: "expense" },
          { label: "Income", value: "income" },
          { label: "Transfer", value: "transfer" },
        ]}
        value={type}
        onChange={(value) => {
          setValue("type", value);
          setValue("category", value === "income" ? "salary" : "food");
        }}
      />

      <div className={styles.form_amount}>
        <span className={styles.form_currency}>{symbol}</span>
        <input
          className={styles.form_amountInput}
          inputMode="decimal"
          placeholder="0"
          {...register("amount")}
        />
      </div>
      {errors.amount && <p className={styles.form_error}>{errors.amount.message}</p>}

      <div className={styles.form_field}>
        <span className={styles.form_label}>Category</span>
        <CategoryPicker
          categories={categoryList}
          value={category}
          onChange={(value) => setValue("category", value)}
        />
      </div>

      <Select
        label="Account"
        options={accounts.map((a) => ({ label: a.name, value: a.id }))}
        error={errors.accountId?.message}
        {...register("accountId")}
      />

      <div className={styles.form_row}>
        <Input
          label="Merchant"
          placeholder="e.g. FreshMart"
          {...register("merchant")}
        />
        <Input label="Date" type="date" {...register("occurredAt")} />
      </div>

      <Textarea label="Note" placeholder="Optional note" {...register("note")} />

      <Button type="submit" fullWidth size="lg" loading={isSubmitting} icon={Sparkles}>
        {type === "income" ? "Add income" : "Save expense"}
      </Button>
    </form>
  );
};
