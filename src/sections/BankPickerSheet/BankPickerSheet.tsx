"use client";

import { BottomSheet } from "@/components/BottomSheet/BottomSheet";
import { Select } from "@/components/Select/Select";
import { Button } from "@/components/Button/Button";
import { accountLabel } from "@/utils";
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
  description = "Expenses here are paid from this account.",
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
        Use this account
      </Button>
    }
  >
    {banks.length === 0 ? (
      <p className={styles.empty}>Add an account on the Savings page first.</p>
    ) : (
      <Select
        label="Account"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        options={banks.map((a) => ({
          label: accountLabel(a, currency),
          value: a.id,
        }))}
      />
    )}
  </BottomSheet>
);
