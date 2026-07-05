"use client";

import { useState } from "react";
import { BottomSheet } from "@/components/BottomSheet/BottomSheet";
import { Input } from "@/components/Input/Input";
import { AmountField } from "@/components/AmountField/AmountField";
import { SheetActions } from "@/components/SheetActions/SheetActions";
import { ConfirmDialog } from "@/components/ConfirmDialog/ConfirmDialog";
import { useFinanceStore } from "@/store/financeStore";
import { useToast } from "@/hooks/useToast";
import { formatCurrency } from "@/utils";
import type { BorrowingPayment } from "@/types";
import styles from "./AddBorrowingPaymentSheet.module.scss";

interface AddBorrowingPaymentSheetProps {
  open: boolean;
  onClose: () => void;
  borrowingId: string | null;
  payment: BorrowingPayment | null;
  outstanding: number;
  currency: string;
}

const todayKey = () => new Date().toISOString().slice(0, 10);

export const AddBorrowingPaymentSheet = ({
  open,
  onClose,
  borrowingId,
  payment,
  outstanding,
  currency,
}: AddBorrowingPaymentSheetProps) => {
  const addBorrowingPayment = useFinanceStore((s) => s.addBorrowingPayment);
  const updateBorrowingPayment = useFinanceStore(
    (s) => s.updateBorrowingPayment,
  );
  const deleteBorrowingPayment = useFinanceStore(
    (s) => s.deleteBorrowingPayment,
  );
  const toast = useToast();
  const isEdit = Boolean(payment);

  const [amount, setAmount] = useState(payment ? String(payment.amount) : "");
  const [paidOn, setPaidOn] = useState(
    payment?.paidOn?.slice(0, 10) ?? todayKey(),
  );
  const [note, setNote] = useState(payment?.note ?? "");
  const [confirmOpen, setConfirmOpen] = useState(false);

  const value = Number(amount) || 0;
  const overpaying = !isEdit && value > outstanding + 0.001;
  const canSave =
    value > 0 && Boolean(paidOn) && Boolean(borrowingId) && !overpaying;

  const save = () => {
    if (!canSave || !borrowingId) return;
    if (payment) {
      updateBorrowingPayment(borrowingId, payment.id, {
        amount: value,
        paidOn,
        note: note.trim() || null,
      });
      toast({ title: "Payment updated", variant: "success" });
    } else {
      addBorrowingPayment(borrowingId, {
        amount: value,
        paidOn,
        note: note.trim() || undefined,
      });
      toast({ title: "Payment added", variant: "success" });
    }
    onClose();
  };

  const remove = () => {
    if (borrowingId && payment) deleteBorrowingPayment(borrowingId, payment.id);
    toast({ title: "Removed", variant: "info" });
    setConfirmOpen(false);
    onClose();
  };

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title={`${isEdit ? "Edit" : "Add"} repayment`}
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
        {!isEdit && outstanding > 0 && (
          <button
            type="button"
            className={styles.full}
            onClick={() => setAmount(String(outstanding))}
          >
            Pay full outstanding · {formatCurrency(outstanding, currency)}
          </button>
        )}
        <Input
          label="Paid on"
          type="date"
          max={todayKey()}
          value={paidOn}
          onChange={(e) => setPaidOn(e.target.value)}
        />
        <Input
          label="Note (optional)"
          placeholder="e.g. paid via UPI"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </div>

      <ConfirmDialog
        open={confirmOpen}
        title="Delete this payment?"
        message="This repayment record will be removed."
        confirmLabel="Delete"
        onConfirm={remove}
        onCancel={() => setConfirmOpen(false)}
      />
    </BottomSheet>
  );
};
