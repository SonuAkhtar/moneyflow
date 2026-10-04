"use client";

import { useState } from "react";
import { BottomSheet } from "@/components/BottomSheet/BottomSheet";
import { Input } from "@/components/Input/Input";
import { SegmentedControl } from "@/components/SegmentedControl/SegmentedControl";
import { SheetActions } from "@/components/SheetActions/SheetActions";
import { ConfirmDialog } from "@/components/ConfirmDialog/ConfirmDialog";
import { useFinanceStore } from "@/store/financeStore";
import { useToast } from "@/hooks/useToast";
import {
  OTHER_ACCOUNT_KINDS,
  type OtherAccountType,
} from "@/constants/accounts";
import { getCurrencySymbol, round2 } from "@/utils";
import type { Account } from "@/types";
import styles from "./OtherAccountSheet.module.scss";

interface OtherAccountSheetProps {
  open: boolean;
  onClose: () => void;
  account?: Account | null;
}

export const OtherAccountSheet = ({
  open,
  onClose,
  account = null,
}: OtherAccountSheetProps) => (
  <BottomSheet
    open={open}
    onClose={onClose}
    title={account ? `Edit ${account.name}` : "Add wallet, cash or card"}
  >
    {open && (
      <Form key={account?.id ?? "new"} account={account} onClose={onClose} />
    )}
  </BottomSheet>
);

const Form = ({
  account,
  onClose,
}: {
  account: Account | null;
  onClose: () => void;
}) => {
  const addAccount = useFinanceStore((s) => s.addAccount);
  const updateAccount = useFinanceStore((s) => s.updateAccount);
  const deleteAccount = useFinanceStore((s) => s.deleteAccount);
  const toast = useToast();
  const symbol = getCurrencySymbol();

  const [type, setType] = useState<OtherAccountType>(
    (account?.type as OtherAccountType | undefined) ?? "wallet",
  );
  const kind = OTHER_ACCOUNT_KINDS.find((k) => k.type === type)!;
  const isCard = type === "card";
  const [name, setName] = useState(account?.name ?? "");
  const [amount, setAmount] = useState(
    account
      ? String(isCard ? Math.max(0, -account.balance) : account.balance)
      : "",
  );
  const [confirmOpen, setConfirmOpen] = useState(false);

  const value = Number(amount) || 0;
  const canSave = Boolean(name.trim()) && amount.trim() !== "" && value >= 0;

  const save = () => {
    if (!canSave) return;
    const balance = round2(isCard ? -value : value);
    if (account) {
      updateAccount(account.id, { name: name.trim(), balance });
      toast({
        title: "Account updated",
        description: name.trim(),
        variant: "success",
      });
    } else {
      addAccount({
        name: name.trim(),
        type,
        balance,
        colorTag: kind.color,
      });
      toast({
        title: `${kind.label} added`,
        description: name.trim(),
        variant: "success",
      });
    }
    onClose();
  };

  const remove = () => {
    if (!account) return;
    deleteAccount(account.id);
    toast({ title: "Account removed", variant: "info" });
    setConfirmOpen(false);
    onClose();
  };

  return (
    <div className={styles.form}>
      {!account && (
        <SegmentedControl<OtherAccountType>
          segments={OTHER_ACCOUNT_KINDS.map((k) => ({
            label: k.label,
            value: k.type,
          }))}
          value={type}
          onChange={setType}
        />
      )}
      <Input
        label="Name"
        placeholder={kind.placeholder}
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <Input
        label={`${isCard ? "Amount owed right now" : "Current balance"} (${symbol})`}
        type="number"
        inputMode="decimal"
        min={0}
        placeholder="0"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        hint={
          isCard
            ? "Spending on this card adds to what you owe. Pay the bill with a transfer from a bank."
            : undefined
        }
      />
      <SheetActions
        onSave={save}
        onDelete={account ? () => setConfirmOpen(true) : undefined}
        saveLabel={account ? "Save changes" : `Add ${kind.label.toLowerCase()}`}
        disabled={!canSave}
      />
      <ConfirmDialog
        open={confirmOpen}
        title={`Delete ${account?.name ?? "this account"}?`}
        message="The account and all transactions recorded against it will be removed."
        confirmLabel="Delete"
        onConfirm={remove}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  );
};
