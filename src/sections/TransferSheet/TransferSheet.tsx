"use client";

import { useMemo, useState } from "react";
import { ArrowDownUp, ArrowRight, Landmark } from "lucide-react";
import { BottomSheet } from "@/components/BottomSheet/BottomSheet";
import { Input } from "@/components/Input/Input";
import { Select } from "@/components/Select/Select";
import { AmountField } from "@/components/AmountField/AmountField";
import { SheetActions } from "@/components/SheetActions/SheetActions";
import { ConfirmDialog } from "@/components/ConfirmDialog/ConfirmDialog";
import { useFinanceStore } from "@/store/financeStore";
import { useToast } from "@/hooks/useToast";
import {
  accountLabel,
  BANK_TRANSFER_OUT_NOTE,
  cn,
  currentDateKey,
  dateKey,
  findTransferPair,
  formatCurrency,
  isCreditCard,
  round2,
} from "@/utils";
import type { Account, Transaction } from "@/types";
import styles from "./TransferSheet.module.scss";

interface TransferSheetProps {
  open: boolean;
  onClose: () => void;
  transfer?: Transaction | null;
}

export const TransferSheet = ({
  open,
  onClose,
  transfer = null,
}: TransferSheetProps) => (
  <BottomSheet
    open={open}
    onClose={onClose}
    title={transfer ? "Edit transfer" : "Transfer between accounts"}
  >
    {open && (
      <Form key={transfer?.id ?? "new"} transfer={transfer} onClose={onClose} />
    )}
  </BottomSheet>
);

interface FormProps {
  transfer: Transaction | null;
  onClose: () => void;
}

const Form = ({ transfer, onClose }: FormProps) => {
  const accounts = useFinanceStore((s) => s.accounts);
  const transactions = useFinanceStore((s) => s.transactions);
  const currency = useFinanceStore((s) => s.profile?.currency ?? "INR");
  const addBankTransfer = useFinanceStore((s) => s.addBankTransfer);
  const updateBankTransfer = useFinanceStore((s) => s.updateBankTransfer);
  const deleteBankTransfer = useFinanceStore((s) => s.deleteBankTransfer);
  const toast = useToast();

  const banks = accounts;

  const legs = useMemo(() => {
    if (!transfer) return null;
    const pair = findTransferPair(transfer, transactions);
    const out = transfer.note === BANK_TRANSFER_OUT_NOTE ? transfer : pair;
    const inn = transfer.note === BANK_TRANSFER_OUT_NOTE ? pair : transfer;
    return { out, inn };
  }, [transfer, transactions]);

  const initialFrom = legs ? (legs.out?.accountId ?? "") : (banks[0]?.id ?? "");
  const [fromId, setFromId] = useState(initialFrom);
  const [toId, setToId] = useState(
    legs
      ? (legs.inn?.accountId ?? "")
      : (banks.find((b) => b.id !== initialFrom)?.id ?? ""),
  );
  const [amount, setAmount] = useState(transfer ? String(transfer.amount) : "");
  const [date, setDate] = useState(
    transfer ? dateKey(transfer.occurredAt) : currentDateKey(),
  );
  const [confirmOpen, setConfirmOpen] = useState(false);

  const from: Account | undefined = accounts.find((a) => a.id === fromId);
  const to: Account | undefined = accounts.find((a) => a.id === toId);
  const value = Number(amount) || 0;
  const previous = transfer?.amount ?? 0;

  const available = from
    ? round2(from.balance + (legs?.out ? previous : 0))
    : 0;
  const fromAfter = from ? round2(available - value) : 0;
  const toAfter = to
    ? round2(to.balance - (legs?.inn ? previous : 0) + value)
    : 0;

  const sameBank = Boolean(fromId) && fromId === toId;
  const fromIsCard = from ? isCreditCard(from) : false;
  const overdrawn = Boolean(from) && !fromIsCard && value > available + 0.001;
  const canSave =
    value > 0 &&
    Boolean(date) &&
    (transfer ? true : Boolean(from && to) && !sameBank) &&
    !overdrawn;

  const fromOptions = banks.map((b) => ({
    label: accountLabel(b, currency),
    value: b.id,
  }));
  const toOptions = banks
    .filter((b) => b.id !== fromId)
    .map((b) => ({
      label: accountLabel(b, currency),
      value: b.id,
    }));

  const changeFrom = (id: string) => {
    setFromId(id);
    if (id === toId) setToId(banks.find((b) => b.id !== id)?.id ?? "");
  };

  const swap = () => {
    setFromId(toId);
    setToId(fromId);
  };

  const save = () => {
    if (!canSave) return;
    if (transfer) {
      updateBankTransfer(transfer.id, { amount: value, date });
      toast({ title: "Transfer updated", variant: "success" });
    } else if (from && to) {
      addBankTransfer({
        fromAccountId: from.id,
        toAccountId: to.id,
        amount: value,
        date,
      });
      toast({
        title: "Transfer done",
        description: `${formatCurrency(value, currency)} from ${from.name} to ${to.name}`,
        variant: "success",
      });
    }
    onClose();
  };

  const remove = () => {
    if (!transfer) return;
    deleteBankTransfer(transfer.id);
    toast({ title: "Transfer deleted", variant: "info" });
    setConfirmOpen(false);
    onClose();
  };

  const fromName = from?.name ?? legs?.inn?.merchant?.replace(/^From /, "");
  const toName = to?.name ?? legs?.out?.merchant?.replace(/^To /, "");

  return (
    <div className={styles.form}>
      {transfer ? (
        <div className={styles.route}>
          <span className={styles.route_bank}>
            <Landmark size={16} />
            {fromName ?? "Deleted bank"}
          </span>
          <ArrowRight size={16} className={styles.route_arrow} />
          <span className={styles.route_bank}>
            <Landmark size={16} />
            {toName ?? "Deleted bank"}
          </span>
        </div>
      ) : (
        <div className={styles.banks}>
          <Select
            label="From"
            value={fromId}
            onChange={(e) => changeFrom(e.target.value)}
            options={fromOptions}
          />
          <button
            type="button"
            className={styles.swap}
            onClick={swap}
            aria-label="Swap banks"
            disabled={!fromId || !toId}
          >
            <ArrowDownUp size={16} />
          </button>
          <Select
            label="To"
            value={toId}
            onChange={(e) => setToId(e.target.value)}
            options={toOptions}
          />
        </div>
      )}

      <AmountField value={amount} onChange={setAmount} />
      {from && !fromIsCard && (
        <div className={styles.available}>
          <span>Available in {from.name}</span>
          <button
            type="button"
            className={styles.max}
            onClick={() => setAmount(String(Math.max(0, available)))}
            disabled={available <= 0}
          >
            {formatCurrency(available, currency)} · Use max
          </button>
        </div>
      )}
      {overdrawn && (
        <p className={styles.error} role="alert">
          Amount is more than the available balance in {from?.name}.
        </p>
      )}

      <Input
        label="Date"
        type="date"
        max={currentDateKey()}
        value={date}
        onChange={(e) => setDate(e.target.value)}
      />

      {value > 0 && (from || to) && (
        <div className={styles.preview}>
          {from && (
            <div className={styles.preview_row}>
              <span>{from.name}</span>
              <span>
                {formatCurrency(available, currency)}
                <ArrowRight size={12} aria-label="becomes" />
                <strong className={cn(fromAfter < 0 && styles.neg)}>
                  {formatCurrency(fromAfter, currency)}
                </strong>
              </span>
            </div>
          )}
          {to && (
            <div className={styles.preview_row}>
              <span>{to.name}</span>
              <span>
                {formatCurrency(round2(toAfter - value), currency)}
                <ArrowRight size={12} aria-label="becomes" />
                <strong>{formatCurrency(toAfter, currency)}</strong>
              </span>
            </div>
          )}
        </div>
      )}

      <SheetActions
        onSave={save}
        onDelete={transfer ? () => setConfirmOpen(true) : undefined}
        saveLabel={
          transfer
            ? "Save changes"
            : `Transfer ${formatCurrency(value, currency)}`
        }
        disabled={!canSave}
      />

      <ConfirmDialog
        open={confirmOpen}
        title="Delete this transfer?"
        message={`${formatCurrency(previous, currency)} will move back${
          fromName ? ` to ${fromName}` : ""
        }${toName ? ` from ${toName}` : ""}.`}
        confirmLabel="Delete"
        onConfirm={remove}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  );
};
