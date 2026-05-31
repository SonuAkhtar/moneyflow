"use client";

import { useState } from "react";
import { BottomSheet } from "@/components/BottomSheet/BottomSheet";
import { Input } from "@/components/Input/Input";
import { AmountField } from "@/components/AmountField/AmountField";
import { SheetActions } from "@/components/SheetActions/SheetActions";
import { ConfirmDialog } from "@/components/ConfirmDialog/ConfirmDialog";
import { useFinanceStore } from "@/store/financeStore";
import { useToast } from "@/hooks/useToast";
import { currentMonthKey, monthLabel } from "@/utils";
import type { EmiKind, EmiPayment } from "@/types";
import styles from "./AddEmiPaymentSheet.module.scss";

interface AddEmiPaymentSheetProps {
  open: boolean;
  onClose: () => void;
  emiId: string | null;
  payment: EmiPayment | null;
  kind: EmiKind;
}

export const AddEmiPaymentSheet = ({
  open,
  onClose,
  emiId,
  payment,
  kind,
}: AddEmiPaymentSheetProps) => {
  const addEmiPayment = useFinanceStore((s) => s.addEmiPayment);
  const updateEmiPayment = useFinanceStore((s) => s.updateEmiPayment);
  const deleteEmiPayment = useFinanceStore((s) => s.deleteEmiPayment);
  const toast = useToast();
  const isEdit = Boolean(payment);
  const noun = kind === "sip" ? "SIP" : "EMI";

  const [amount, setAmount] = useState(payment ? String(payment.amount) : "");
  const [month, setMonth] = useState(payment ? payment.month : currentMonthKey());
  const [confirmOpen, setConfirmOpen] = useState(false);

  const value = Number(amount) || 0;
  const canSave = value > 0 && Boolean(month) && Boolean(emiId);

  const save = () => {
    if (!canSave || !emiId) return;
    if (payment) {
      updateEmiPayment(emiId, payment.id, { amount: value, month });
      toast({ title: `${noun} updated`, variant: "success" });
    } else {
      addEmiPayment(emiId, { amount: value, month });
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
        <AmountField value={amount} onChange={setAmount} autoFocus />
        <Input
          label="Month & Year"
          type="month"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
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
