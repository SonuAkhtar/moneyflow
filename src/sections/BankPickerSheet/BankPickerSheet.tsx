"use client";

import { BottomSheet } from "@/components/BottomSheet/BottomSheet";
import { Select } from "@/components/Select/Select";
import { Button } from "@/components/Button/Button";
import { formatCurrency } from "@/utils";
import type { Account } from "@/types";
import styles from "./BankPickerSheet.module.scss";

interface BankPickerSheetProps {
  open: boolean;
  title: string;
  description?: string;
  banks: Account[];
  value: string;
  currency: string;
  onChange: (id: string) => void;
  onConfirm: () => void;
  onClose: () => void;
}

export const BankPickerSheet = ({
  open,
  title,
  description = "Expenses here are paid from this savings bank.",
  banks,
  value,
  currency,
  onChange,
  onConfirm,
  onClose,
}: BankPickerSheetProps) => (
  <BottomSheet
    open={open}
    onClose={onClose}
    title={title}
    description={description}
    footer={
      <Button size="lg" fullWidth onClick={onConfirm} disabled={!value}>
        Use this bank
      </Button>
    }
  >
    {banks.length === 0 ? (
      <p className={styles.empty}>Add a savings bank under Total savings first.</p>
    ) : (
      <Select
        label="Savings bank"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        options={banks.map((a) => ({
          label: `${a.name} · ${formatCurrency(a.balance, currency)}`,
          value: a.id,
        }))}
      />
    )}
  </BottomSheet>
);
