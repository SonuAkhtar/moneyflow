"use client";

import { useState } from "react";
import { BottomSheet } from "@/components/BottomSheet/BottomSheet";
import { Input } from "@/components/Input/Input";
import { SheetActions } from "@/components/SheetActions/SheetActions";
import { ConfirmDialog } from "@/components/ConfirmDialog/ConfirmDialog";
import { useFinanceStore } from "@/store/financeStore";
import { useToast } from "@/hooks/useToast";
import { cn, formatCurrency, getCurrencySymbol } from "@/utils";
import { BANK_PRESETS, getBankByName } from "@/constants/banks";
import type { Account } from "@/types";
import styles from "./AddSavingsSheet.module.scss";

interface AddSavingsSheetProps {
  open: boolean;
  onClose: () => void;
  account?: Account | null;
}

export const AddSavingsSheet = ({
  open,
  onClose,
  account,
}: AddSavingsSheetProps) => {
  const addAccount = useFinanceStore((s) => s.addAccount);
  const updateAccount = useFinanceStore((s) => s.updateAccount);
  const deleteAccount = useFinanceStore((s) => s.deleteAccount);
  const currency = useFinanceStore((s) => s.profile?.currency ?? "INR");
  const toast = useToast();
  const symbol = getCurrencySymbol();
  const isEdit = Boolean(account);

  const [bankId, setBankId] = useState(
    account
      ? (getBankByName(account.name)?.id ?? "other")
      : BANK_PRESETS[0]!.id,
  );
  const [otherName, setOtherName] = useState(
    account && !getBankByName(account.name) ? account.name : "",
  );
  const [amount, setAmount] = useState(account ? String(account.balance) : "");
  const [confirmOpen, setConfirmOpen] = useState(false);

  const selectedBank =
    BANK_PRESETS.find((b) => b.id === bankId) ?? BANK_PRESETS[0]!;
  const bankName = bankId === "other" ? otherName.trim() : selectedBank.name;
  const value = Number(amount) || 0;
  const canSave = Boolean(bankName) && value > 0;

  const submit = () => {
    if (!canSave) return;
    if (account) {
      updateAccount(account.id, {
        name: bankName,
        institution: bankName,
        balance: value,
        colorTag: selectedBank.color,
      });
      toast({
        title: "Bank updated",
        description: bankName,
        variant: "success",
      });
    } else {
      addAccount({
        name: bankName,
        type: "savings",
        balance: value,
        institution: bankName,
        colorTag: selectedBank.color,
      });
      toast({ title: "Bank added", description: bankName, variant: "success" });
    }
    onClose();
  };

  const confirmDelete = () => {
    if (account) deleteAccount(account.id);
    toast({ title: "Bank removed", variant: "info" });
    setConfirmOpen(false);
    onClose();
  };

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title={isEdit ? "Edit bank savings" : "Add bank savings"}
      footer={
        <SheetActions
          onSave={submit}
          onDelete={isEdit ? () => setConfirmOpen(true) : undefined}
          saveLabel={
            isEdit ? "Save changes" : `Add ${formatCurrency(value, currency)}`
          }
          disabled={!canSave}
        />
      }
    >
      <div className={styles.form}>
        <div className={styles.field}>
          <span className={styles.label}>Bank</span>
          <div className={styles.banks}>
            {BANK_PRESETS.map((bank) => {
              const active = bank.id === bankId;
              return (
                <button
                  key={bank.id}
                  type="button"
                  className={cn(styles.bank, active && styles["bank--active"])}
                  onClick={() => setBankId(bank.id)}
                >
                  <span
                    className={styles.bank_icon}
                    style={{ background: `${bank.color}24`, color: bank.color }}
                  >
                    <bank.icon size={18} />
                  </span>
                  <span className={styles.bank_name}>{bank.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {bankId === "other" && (
          <Input
            label="Bank name"
            placeholder="e.g. Yes Bank"
            value={otherName}
            onChange={(e) => setOtherName(e.target.value)}
          />
        )}

        <Input
          label={`Saved till last month (${symbol})`}
          type="number"
          inputMode="decimal"
          placeholder="0"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
      </div>

      <ConfirmDialog
        open={confirmOpen}
        title="Delete this bank?"
        message={`"${account?.name ?? ""}", its balance, and all transactions recorded against it will be removed.`}
        confirmLabel="Delete"
        onConfirm={confirmDelete}
        onCancel={() => setConfirmOpen(false)}
      />
    </BottomSheet>
  );
};
