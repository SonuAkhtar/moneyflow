"use client";

import { useState } from "react";
import { BottomSheet } from "@/components/BottomSheet/BottomSheet";
import { Input } from "@/components/Input/Input";
import { Select } from "@/components/Select/Select";
import { AmountField } from "@/components/AmountField/AmountField";
import { SheetActions } from "@/components/SheetActions/SheetActions";
import { ConfirmDialog } from "@/components/ConfirmDialog/ConfirmDialog";
import { useFinanceStore } from "@/store/financeStore";
import { useSpendAccounts } from "@/hooks/useSpendAccounts";
import { useToast } from "@/hooks/useToast";
import {
  currentDateKey,
  currentMonthKey,
  formatCurrency,
  monthKey,
  monthLabel,
} from "@/utils";
import type { EmiKind, EmiPayment } from "@/types";
import styles from "./AddEmiPaymentSheet.module.scss";

interface AddEmiPaymentSheetProps {
  open: boolean;
  onClose: () => void;
  emiId: string | null;
  payment: EmiPayment | null;
  kind: EmiKind;
  defaultMonth?: string | null;
}

export const AddEmiPaymentSheet = ({
  open,
  onClose,
  emiId,
  payment,
  kind,
  defaultMonth = null,
}: AddEmiPaymentSheetProps) => {
  const addEmiPayment = useFinanceStore((s) => s.addEmiPayment);
  const updateEmiPayment = useFinanceStore((s) => s.updateEmiPayment);
  const deleteEmiPayment = useFinanceStore((s) => s.deleteEmiPayment);
  const currency = useFinanceStore((s) => s.profile?.currency ?? "INR");
  const { banks, defaultBankId, resolve } = useSpendAccounts(
    payment?.accountId,
  );
  const toast = useToast();
  const isEdit = Boolean(payment);
  const noun = kind === "sip" ? "SIP" : "EMI";

  const [amount, setAmount] = useState(payment ? String(payment.amount) : "");
  const [paidOn, setPaidOn] = useState(
    payment?.paidOn?.slice(0, 10) ??
      (defaultMonth && defaultMonth !== currentMonthKey()
        ? `${defaultMonth}-01`
        : currentDateKey()),
  );
  const [bankId, setBankId] = useState(defaultBankId);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const value = Number(amount) || 0;
  const canSave =
    value > 0 && Boolean(paidOn) && Boolean(emiId) && Boolean(resolve(bankId));

  const save = () => {
    if (!canSave || !emiId) return;
    const account = resolve(bankId);
    const month = monthKey(paidOn);
    if (payment) {
      updateEmiPayment(emiId, payment.id, {
        amount: value,
        month,
        paidOn,
        accountId: account?.id ?? null,
      });
      toast({ title: `${noun} updated`, variant: "success" });
    } else {
      addEmiPayment(emiId, {
        amount: value,
        month,
        paidOn,
        accountId: account?.id ?? null,
      });
      toast({
        title: `${noun} added`,
        description: monthLabel(month),
        variant: "success",
      });
    }
    onClose();
  };

  const remove = () => {
    if (emiId && payment) deleteEmiPayment(emiId, payment.id);
    toast({ title: "Removed", variant: "info" });
    setConfirmOpen(false);
    onClose();
  };

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title={`${isEdit ? "Edit" : "Add"} ${noun} payment`}
      footer={
        <SheetActions
          onSave={save}
          onDelete={isEdit ? () => setConfirmOpen(true) : undefined}
          saveLabel={isEdit ? "Save changes" : "Add"}
          disabled={!canSave}
        />
      }
    >
      <div className={styles.body}>
        <AmountField value={amount} onChange={setAmount} />
        <Input
          label="Payment date"
          type="date"
          max={currentDateKey()}
          value={paidOn}
          onChange={(e) => setPaidOn(e.target.value)}
        />
        <Select
          label="Pay from bank"
          value={bankId}
          onChange={(e) => setBankId(e.target.value)}
          options={banks.map((a) => ({
            label: `${a.name} · ${formatCurrency(a.balance, currency)}`,
            value: a.id,
          }))}
        />
      </div>

      <ConfirmDialog
        open={confirmOpen}
        title="Delete this entry?"
        message="This payment record will be removed."
        confirmLabel="Delete"
        onConfirm={remove}
        onCancel={() => setConfirmOpen(false)}
      />
    </BottomSheet>
  );
};
