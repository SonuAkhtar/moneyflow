"use client";

import { useRef, useState } from "react";
import { BottomSheet } from "@/components/BottomSheet/BottomSheet";
import { Input } from "@/components/Input/Input";
import { Select } from "@/components/Select/Select";
import { AmountField } from "@/components/AmountField/AmountField";
import { SegmentedControl } from "@/components/SegmentedControl/SegmentedControl";
import { SheetActions } from "@/components/SheetActions/SheetActions";
import { ConfirmDialog } from "@/components/ConfirmDialog/ConfirmDialog";
import { useFinanceStore } from "@/store/financeStore";
import { useSpendAccounts } from "@/hooks/useSpendAccounts";
import { useToast } from "@/hooks/useToast";
import {
  accountLabel,
  currentDateKey,
  currentMonthKey,
  emiAmountFor,
  emiCanLogMonth,
  emiEndMonth,
  emiInstalments,
  emiStartMonth,
  shiftMonth,
  formatCurrency,
  lastNMonthKeys,
  monthLabel,
} from "@/utils";
import type { EmiKind, EmiPayment, EmiPaymentKind } from "@/types";
import styles from "./AddEmiPaymentSheet.module.scss";

const PAYMENT_KINDS: { label: string; value: EmiPaymentKind }[] = [
  { label: "EMI", value: "emi" },
  { label: "Lump sum", value: "extra" },
];

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
  const emi = useFinanceStore((s) => s.emis.find((e) => e.id === emiId));
  const payments = emi?.payments;
  const { banks, defaultBankId, resolve } = useSpendAccounts(
    payment?.accountId,
  );
  const toast = useToast();
  const isEdit = Boolean(payment);
  const noun = kind === "sip" ? "SIP" : "EMI";
  const [paymentKind, setPaymentKind] = useState<EmiPaymentKind>(
    payment?.kind ?? "emi",
  );
  const extra = paymentKind === "extra";

  const loanMonths = (() => {
    if (kind !== "loan" || !emi) return null;
    const last = emi.totalMonths > 0 ? emiEndMonth(emi) : currentMonthKey();
    const logged = new Set(
      emiInstalments(emi)
        .filter((p) => p.id !== payment?.id)
        .map((p) => p.month),
    );
    const months: string[] = [];
    for (let m = emiStartMonth(emi); m <= last; m = shiftMonth(m, 1))
      if (!logged.has(m)) months.push(m);
    return months;
  })();
  const loggable =
    loanMonths ??
    lastNMonthKeys(12)
      .reverse()
      .filter((m) => !emi || emiCanLogMonth(emi, m));
  const [month, setMonth] = useState(
    payment?.month ??
      defaultMonth ??
      (loggable.includes(currentMonthKey())
        ? currentMonthKey()
        : (loggable[0] ?? currentMonthKey())),
  );
  const defaultAmount = (m: string) =>
    !payment && !extra && emi && kind === "loan"
      ? String(emiAmountFor(emi, m))
      : "";
  const [amount, setAmount] = useState(
    payment ? String(payment.amount) : defaultAmount(month),
  );
  const [paidOn, setPaidOn] = useState(
    payment?.paidOn?.slice(0, 10) ??
      (defaultMonth && defaultMonth !== currentMonthKey()
        ? `${defaultMonth}-01`
        : currentDateKey()),
  );
  const [bankId, setBankId] = useState(
    payment && !payment.accountId ? "" : defaultBankId,
  );
  const [confirmOpen, setConfirmOpen] = useState(false);
  const submitted = useRef(false);

  const monthOptions = [...loggable];
  if (!monthOptions.includes(month)) monthOptions.push(month);
  const monthCounted =
    !extra && !isEdit && Boolean(emi) && !emiCanLogMonth(emi!, month);
  const bankOptions = banks.map((a) => ({
    label: accountLabel(a, currency),
    value: a.id,
  }));
  if (isEdit) bankOptions.unshift({ label: "No bank", value: "" });

  const monthTaken =
    !extra &&
    emiInstalments({ payments }).some(
      (p) => p.month === month && p.id !== payment?.id,
    );
  const paidMonth = extra ? paidOn.slice(0, 7) : month;
  const value = Number(amount) || 0;
  const canSave =
    value > 0 &&
    !monthTaken &&
    !monthCounted &&
    Boolean(paidOn) &&
    paidOn <= currentDateKey() &&
    Boolean(emiId) &&
    (Boolean(resolve(bankId)) || (isEdit && bankId === ""));

  const save = () => {
    if (!canSave || !emiId || submitted.current) return;
    submitted.current = true;
    const account = resolve(bankId);
    if (payment) {
      updateEmiPayment(emiId, payment.id, {
        amount: value,
        month: paidMonth,
        paidOn,
        accountId: account?.id ?? null,
      });
      toast({ title: `${noun} updated`, variant: "success" });
    } else {
      addEmiPayment(emiId, {
        kind: paymentKind,
        amount: value,
        month: paidMonth,
        paidOn,
        accountId: account?.id ?? null,
      });
      toast({
        title: extra ? "Lump sum added" : `${noun} added`,
        description: monthLabel(paidMonth),
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
      title={`${isEdit ? "Edit" : "Add"} ${extra ? "lump sum" : noun} payment`}
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
        {kind === "loan" && !isEdit && (
          <SegmentedControl
            aria-label="Payment type"
            segments={PAYMENT_KINDS}
            value={paymentKind}
            onChange={(next) => {
              if (amount === defaultAmount(month))
                setAmount(
                  next === "extra" || !emi
                    ? ""
                    : String(emiAmountFor(emi, month)),
                );
              setPaymentKind(next);
            }}
          />
        )}
        <AmountField value={amount} onChange={setAmount} />
        {!extra && (
          <Select
            label={`${noun} for`}
            value={month}
            onChange={(e) => {
              if (amount === defaultAmount(month))
                setAmount(defaultAmount(e.target.value));
              setMonth(e.target.value);
            }}
            options={monthOptions.map((m) => ({
              label: monthLabel(m),
              value: m,
            }))}
            error={
              monthTaken
                ? `${monthLabel(month)} already has a payment. Edit that one instead.`
                : monthCounted
                  ? `${monthLabel(month)} is outside this plan's schedule.`
                  : undefined
            }
          />
        )}
        <Input
          label="Payment date"
          type="date"
          max={currentDateKey()}
          value={paidOn}
          onChange={(e) => setPaidOn(e.target.value)}
          error={
            paidOn > currentDateKey()
              ? "Pick today or an earlier date"
              : undefined
          }
        />
        <Select
          label="Pay from bank"
          value={bankId}
          onChange={(e) => setBankId(e.target.value)}
          options={bankOptions}
          error={
            bankOptions.length === 0
              ? "Add a bank account in Savings first"
              : undefined
          }
        />
      </div>

      <ConfirmDialog
        open={confirmOpen}
        title="Delete this entry?"
        message={
          payment?.accountId
            ? `This payment record will be removed and ${formatCurrency(payment.amount, currency)} added back to your bank balance.`
            : "This payment record will be removed."
        }
        confirmLabel="Delete"
        onConfirm={remove}
        onCancel={() => setConfirmOpen(false)}
      />
    </BottomSheet>
  );
};
