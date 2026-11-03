"use client";

import { useRef, useState } from "react";
import { Landmark } from "lucide-react";
import { BottomSheet } from "@/components/BottomSheet/BottomSheet";
import { Input } from "@/components/Input/Input";
import { NumberInput } from "@/components/NumberInput/NumberInput";
import { Select } from "@/components/Select/Select";
import { SheetActions } from "@/components/SheetActions/SheetActions";
import { ConfirmDialog } from "@/components/ConfirmDialog/ConfirmDialog";
import { useFinanceStore } from "@/store/financeStore";
import { useToast } from "@/hooks/useToast";
import {
  accountMonthDelta,
  bankMonthFlow,
  cn,
  currentMonthKey,
  formatCurrency,
  getCurrencySymbol,
  round2,
} from "@/utils";
import { BANK_PRESETS, getBankByName } from "@/constants/banks";
import type { Account } from "@/types";
import styles from "./AddSavingsSheet.module.scss";

interface AddSavingsSheetProps {
  open: boolean;
  onClose: () => void;
  account?: Account | null;
}

const toNum = (v: string) => Number(v) || 0;

export const AddSavingsSheet = ({
  open,
  onClose,
  account,
}: AddSavingsSheetProps) => {
  const addAccount = useFinanceStore((s) => s.addAccount);
  const updateAccount = useFinanceStore((s) => s.updateAccount);
  const deleteAccount = useFinanceStore((s) => s.deleteAccount);
  const transactions = useFinanceStore((s) => s.transactions);
  const currency = useFinanceStore((s) => s.profile?.currency ?? "INR");
  const toast = useToast();
  const symbol = getCurrencySymbol();
  const isEdit = Boolean(account);

  const month = currentMonthKey();
  const thisMonthDelta = account
    ? accountMonthDelta(account.id, transactions, month)
    : 0;

  const [bankId, setBankId] = useState(
    account
      ? (getBankByName(account.name)?.id ?? "other")
      : BANK_PRESETS[0]!.id,
  );
  const [otherName, setOtherName] = useState(
    account && !getBankByName(account.name) ? account.name : "",
  );
  const [current, setCurrent] = useState(
    account ? String(account.balance) : "",
  );
  const [savedLast, setSavedLast] = useState(
    account ? String(round2(account.balance - thisMonthDelta)) : "",
  );
  const [confirmOpen, setConfirmOpen] = useState(false);
  const submitted = useRef(false);

  const selectedBank =
    BANK_PRESETS.find((b) => b.id === bankId) ?? BANK_PRESETS[0]!;
  const bankName = bankId === "other" ? otherName.trim() : selectedBank.name;

  const currentValue = toNum(current);
  const savedLastValue = toNum(savedLast);
  const transferNet = account
    ? bankMonthFlow(account.id, transactions, month).transferNet
    : 0;
  const liveDelta = round2(currentValue - savedLastValue - transferNet);

  const balanceField = isEdit ? current : savedLast;
  const balanceValue = isEdit ? currentValue : savedLastValue;
  const canSave =
    Boolean(bankName) &&
    balanceField.trim() !== "" &&
    (isEdit ? savedLast.trim() !== "" : balanceValue >= 0);

  const submit = () => {
    if (!canSave || submitted.current) return;
    submitted.current = true;
    if (account) {
      const adjustment = round2(currentValue - savedLastValue - thisMonthDelta);
      updateAccount(
        account.id,
        {
          name: bankName,
          institution: bankName,
          balance: currentValue,
          colorTag: selectedBank.color,
        },
        adjustment,
      );
      toast({
        title: "Bank updated",
        description: bankName,
        variant: "success",
      });
    } else {
      addAccount({
        name: bankName,
        type: "savings",
        balance: balanceValue,
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
            isEdit
              ? "Save changes"
              : `Add ${formatCurrency(balanceValue, currency)}`
          }
          disabled={!canSave}
        />
      }
    >
      <div className={styles.form}>
        <Select
          label="Bank"
          value={bankId}
          onChange={(e) => setBankId(e.target.value)}
          options={BANK_PRESETS.map((b) => ({ label: b.name, value: b.id }))}
        />

        {bankId === "other" && (
          <Input
            label="Bank name"
            placeholder="e.g. Yes Bank"
            value={otherName}
            onChange={(e) => setOtherName(e.target.value)}
          />
        )}

        {isEdit && (
          <div className={styles.hero}>
            <span
              className={styles.hero_icon}
              style={{
                background: `${selectedBank.color}22`,
                color: selectedBank.color,
              }}
            >
              <Landmark size={22} />
            </span>
            <div className={styles.hero_text}>
              <span className={styles.hero_label}>Current balance</span>
              <span
                className={cn(
                  styles.hero_value,
                  balanceValue < 0 && styles["hero_value--neg"],
                )}
              >
                {formatCurrency(balanceValue, currency)}
              </span>
            </div>
            {liveDelta !== 0 && (
              <span
                className={cn(
                  styles.hero_chip,
                  liveDelta > 0
                    ? styles["hero_chip--in"]
                    : styles["hero_chip--out"],
                )}
              >
                {liveDelta > 0 ? "+" : "-"}
                {formatCurrency(Math.abs(liveDelta), currency)}
                <span className={styles.hero_chipCaption}>this month</span>
              </span>
            )}
          </div>
        )}

        {isEdit ? (
          <div className={styles.fields}>
            <NumberInput
              label={`Current balance (${symbol})`}
              inputMode="decimal"
              placeholder="0"
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
            />
            <NumberInput
              label={`Saved till last month (${symbol})`}
              inputMode="decimal"
              placeholder="0"
              value={savedLast}
              onChange={(e) => setSavedLast(e.target.value)}
            />
          </div>
        ) : (
          <NumberInput
            label={`Saved till last month (${symbol})`}
            inputMode="decimal"
            placeholder="0"
            value={savedLast}
            onChange={(e) => setSavedLast(e.target.value)}
          />
        )}
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
