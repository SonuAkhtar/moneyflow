"use client";

import { useRef, useState } from "react";
import { BottomSheet } from "@/components/BottomSheet/BottomSheet";
import { Input } from "@/components/Input/Input";
import { NumberInput } from "@/components/NumberInput/NumberInput";
import { SheetActions } from "@/components/SheetActions/SheetActions";
import { ConfirmDialog } from "@/components/ConfirmDialog/ConfirmDialog";
import { useFinanceStore } from "@/store/financeStore";
import { useToast } from "@/hooks/useToast";
import {
  borrowingRepaid,
  currentDateKey,
  dayShort,
  formatCurrency,
  getCurrencySymbol,
} from "@/utils";
import type { Borrowing } from "@/types";
import styles from "./AddBorrowingSheet.module.scss";

interface AddBorrowingSheetProps {
  open: boolean;
  onClose: () => void;
  borrowing?: Borrowing | null;
}

const todayKey = currentDateKey;

export const AddBorrowingSheet = ({
  open,
  onClose,
  borrowing,
}: AddBorrowingSheetProps) => {
  const addBorrowing = useFinanceStore((s) => s.addBorrowing);
  const updateBorrowing = useFinanceStore((s) => s.updateBorrowing);
  const deleteBorrowing = useFinanceStore((s) => s.deleteBorrowing);
  const toast = useToast();
  const symbol = getCurrencySymbol();
  const isEdit = Boolean(borrowing);

  const [lender, setLender] = useState(borrowing?.lender ?? "");
  const [amount, setAmount] = useState(
    borrowing ? String(borrowing.amount) : "",
  );
  const [borrowedOn, setBorrowedOn] = useState(
    borrowing?.borrowedOn?.slice(0, 10) ?? todayKey(),
  );
  const [dueDate, setDueDate] = useState(
    borrowing?.dueDate?.slice(0, 10) ?? "",
  );
  const [purpose, setPurpose] = useState(borrowing?.purpose ?? "");
  const [note, setNote] = useState(borrowing?.note ?? "");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const submitted = useRef(false);

  const value = Number(amount) || 0;
  const repaid = borrowing ? borrowingRepaid(borrowing) : 0;
  const belowRepaid = value > 0 && value < repaid - 0.001;
  const futureBorrow = borrowedOn > todayKey();
  const dueTooEarly = Boolean(dueDate) && dueDate < borrowedOn;
  const firstRepaid = (borrowing?.payments ?? [])
    .map((p) => p.paidOn.slice(0, 10))
    .sort()[0];
  const afterRepaid = Boolean(firstRepaid) && borrowedOn > firstRepaid!;
  const canSave =
    value > 0 &&
    Boolean(lender.trim()) &&
    !belowRepaid &&
    !futureBorrow &&
    !afterRepaid &&
    !dueTooEarly;

  const submit = () => {
    if (!canSave || submitted.current) return;
    submitted.current = true;
    const lenderName = lender.trim();
    const on = borrowedOn || todayKey();
    if (borrowing) {
      updateBorrowing(borrowing.id, {
        lender: lenderName,
        amount: value,
        borrowedOn: on,
        dueDate: dueDate || null,
        purpose: purpose.trim() || null,
        note: note.trim() || null,
      });
      toast({ title: "Updated", description: lenderName, variant: "success" });
    } else {
      addBorrowing({
        lender: lenderName,
        amount: value,
        borrowedOn: on,
        dueDate: dueDate || undefined,
        purpose: purpose.trim() || undefined,
        note: note.trim() || undefined,
      });
      toast({
        title: "Borrowing recorded",
        description: lenderName,
        variant: "success",
      });
      setLender("");
      setAmount("");
      setBorrowedOn(todayKey());
      setDueDate("");
      setPurpose("");
      setNote("");
    }
    onClose();
  };

  const confirmDelete = () => {
    if (!borrowing) return;
    deleteBorrowing(borrowing.id);
    toast({ title: "Removed", variant: "info" });
    setConfirmOpen(false);
    onClose();
  };

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title={isEdit ? "Edit borrowing" : "Record borrowed money"}
      footer={
        <SheetActions
          onSave={submit}
          onDelete={isEdit ? () => setConfirmOpen(true) : undefined}
          saveLabel={isEdit ? "Save changes" : "Add"}
          disabled={!canSave}
        />
      }
    >
      <div className={styles.form}>
        <div className={styles.row}>
          <Input
            label="Borrowed from"
            placeholder="e.g. Rahul"
            value={lender}
            onChange={(e) => setLender(e.target.value)}
          />
          <NumberInput
            label={`Amount (${symbol})`}
            inputMode="decimal"
            placeholder="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            error={
              belowRepaid
                ? `You have already repaid ${formatCurrency(repaid)}`
                : undefined
            }
          />
        </div>
        <div className={styles.row}>
          <Input
            label="Borrowed on"
            type="date"
            max={todayKey()}
            value={borrowedOn}
            onChange={(e) => setBorrowedOn(e.target.value)}
            error={
              futureBorrow
                ? "Pick today or an earlier date"
                : afterRepaid
                  ? `A repayment was made on ${dayShort(firstRepaid!)}`
                  : undefined
            }
          />
          <Input
            label="Due date (optional)"
            type="date"
            min={borrowedOn}
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            error={
              dueTooEarly ? "Pick a date on or after Borrowed on" : undefined
            }
          />
        </div>
        <Input
          label="Purpose (optional)"
          placeholder="e.g. Medical, rent, emergency"
          value={purpose}
          onChange={(e) => setPurpose(e.target.value)}
        />
        <Input
          label="Note (optional)"
          placeholder="Any other details"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </div>

      <ConfirmDialog
        open={confirmOpen}
        title="Delete this borrowing?"
        message={`"${borrowing?.lender ?? ""}" and its payment history will be removed.`}
        confirmLabel="Delete"
        onConfirm={confirmDelete}
        onCancel={() => setConfirmOpen(false)}
      />
    </BottomSheet>
  );
};
