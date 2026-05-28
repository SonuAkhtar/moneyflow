"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { BottomSheet } from "@/components/BottomSheet/BottomSheet";
import { Input } from "@/components/Input/Input";
import { Select } from "@/components/Select/Select";
import { Button } from "@/components/Button/Button";
import { ColorPicker } from "@/components/ColorPicker/ColorPicker";
import { useFinanceStore } from "@/store/financeStore";
import { useToast } from "@/hooks/useToast";
import { accountSchema, type AccountValues } from "@/utils/validation";
import { ACCOUNT_COLOR_TAGS } from "@/constants";
import type { AccountType } from "@/types";
import styles from "./AddAccountSheet.module.scss";

interface AddAccountSheetProps {
  open: boolean;
  onClose: () => void;
}

const TYPE_OPTIONS = [
  { label: "Bank account", value: "bank" },
  { label: "Savings", value: "savings" },
  { label: "Wallet", value: "wallet" },
  { label: "Cash", value: "cash" },
  { label: "Card", value: "card" },
];

export const AddAccountSheet = ({ open, onClose }: AddAccountSheetProps) => {
  const addAccount = useFinanceStore((s) => s.addAccount);
  const toast = useToast();

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<AccountValues>({
    resolver: zodResolver(accountSchema),
    defaultValues: {
      name: "",
      type: "bank",
      balance: 0,
      institution: "",
      colorTag: ACCOUNT_COLOR_TAGS[0],
      isPrimary: false,
    },
  });

  const colorTag = watch("colorTag");

  const submit = handleSubmit((values) => {
    addAccount({ ...values, type: values.type as AccountType });
    toast({ title: "Wallet added", description: values.name, variant: "success" });
    reset();
    onClose();
  });

  return (
    <BottomSheet open={open} onClose={onClose} title="Add wallet">
      <form className={styles.form} onSubmit={submit}>
        <Input
          label="Name"
          placeholder="e.g. Travel Fund"
          error={errors.name?.message}
          {...register("name")}
        />
        <Select label="Type" options={TYPE_OPTIONS} {...register("type")} />
        <Input
          label="Starting balance"
          type="number"
          inputMode="decimal"
          error={errors.balance?.message}
          {...register("balance")}
        />
        <Input label="Institution" placeholder="Optional" {...register("institution")} />

        <ColorPicker value={colorTag} onChange={(color) => setValue("colorTag", color)} />

        <label className={styles.primary}>
          <input type="checkbox" {...register("isPrimary")} />
          <span>Set as primary wallet</span>
        </label>

        <Button type="submit" size="lg" fullWidth loading={isSubmitting}>
          Add wallet
        </Button>
      </form>
    </BottomSheet>
  );
};
