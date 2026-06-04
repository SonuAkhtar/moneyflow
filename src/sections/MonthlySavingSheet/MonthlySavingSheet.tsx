"use client";

import { useState } from "react";
import { Landmark, Minus, Plus } from "lucide-react";
import { BottomSheet } from "@/components/BottomSheet/BottomSheet";
import { Button } from "@/components/Button/Button";
import { AmountField } from "@/components/AmountField/AmountField";
import { useFinanceStore } from "@/store/financeStore";
import { useToast } from "@/hooks/useToast";
import { bankMonthFlow, cn, currentMonthKey, formatCurrency } from "@/utils";
import type { Account } from "@/types";
import styles from "./MonthlySavingSheet.module.scss";

interface MonthlySavingSheetProps {
  open: boolean;
  onClose: () => void;
  account: Account | null;
}

export const MonthlySavingSheet = ({
  open,
  onClose,
  account,
}: MonthlySavingSheetProps) => (
  <BottomSheet open={open} onClose={onClose} title="Add saving for this month">
    {account && <Form key={account.id} account={account} onClose={onClose} />}
  </BottomSheet>
);

const Form = ({ account, onClose }: { account: Account; onClose: () => void }) => {
  const addSavingDeposit = useFinanceStore((s) => s.addSavingDeposit);
  const addSavingWithdrawal = useFinanceStore((s) => s.addSavingWithdrawal);
  const transactions = useFinanceStore((s) => s.transactions);
  const currency = useFinanceStore((s) => s.profile?.currency ?? "INR");
  const toast = useToast();

  const flow = bankMonthFlow(account.id, transactions, currentMonthKey());
  const savedTillLastMonth = account.balance - flow.net;

  const [mode, setMode] = useState<"add" | "take">("add");
  const [amount, setAmount] = useState("");
  const value = Number(amount) || 0;
  const newBalance =
    mode === "add" ? account.balance + value : account.balance - value;
  const canSave = value > 0 && newBalance >= 0;

  const save = () => {
    if (!canSave) return;
    if (mode === "add") {
      addSavingDeposit(account.id, value);
    } else {
      addSavingWithdrawal(account.id, value);
    }
    toast({
      title: mode === "add" ? "Saving added" : "Money taken out",
      description: account.name,
      variant: mode === "add" ? "success" : "info",
    });
    onClose();
  };

  return (
    <div className={styles.form}>
      <div className={styles.bank}>
        <span className={styles.bank_logo}>
          <Landmark size={22} />
        </span>
        <div className={styles.bank_info}>
          <span className={styles.bank_name}>{account.name}</span>
          <span className={styles.bank_sub}>Bank savings</span>
        </div>
      </div>

      <div className={styles.summary}>
        <div className={styles.summary_row}>
          <span className={styles.summary_label}>Saved till last month</span>
          <span className={styles.summary_value}>
            {formatCurrency(savedTillLastMonth, currency)}
          </span>
        </div>
        {flow.added > 0 && (
          <div className={styles.summary_row}>
            <span className={styles.summary_label}>Added this month</span>
            <span className={`${styles.summary_value} ${styles["summary_value--in"]}`}>
              +{formatCurrency(flow.added, currency)}
            </span>
          </div>
        )}
        {flow.taken > 0 && (
          <div className={styles.summary_row}>
            <span className={styles.summary_label}>Taken this month</span>
            <span className={`${styles.summary_value} ${styles["summary_value--out"]}`}>
              -{formatCurrency(flow.taken, currency)}
            </span>
          </div>
        )}
        <div className={`${styles.summary_row} ${styles["summary_row--total"]}`}>
          <span className={styles.summary_label}>Total saved</span>
          <span className={styles.summary_value}>
            {formatCurrency(account.balance, currency)}
          </span>
        </div>
      </div>

      <div className={styles.toggle}>
        <button
          type="button"
          className={cn(styles.toggle_btn, mode === "add" && styles["toggle_btn--add"])}
          onClick={() => setMode("add")}
        >
          <Plus size={16} /> Add money
        </button>
        <button
          type="button"
          className={cn(styles.toggle_btn, mode === "take" && styles["toggle_btn--take"])}
          onClick={() => setMode("take")}
        >
          <Minus size={16} /> Take money
        </button>
      </div>

      <AmountField
        value={amount}
        onChange={setAmount}
        tone={mode === "add" ? "success" : "danger"}
      />


      <div className={styles.preview}>
        <span className={styles.preview_label}>New total</span>
        <span className={styles.preview_value}>
          {formatCurrency(Math.max(0, newBalance), currency)}
        </span>
      </div>

      <Button size="lg" fullWidth onClick={save} disabled={!canSave}>
        {mode === "add" ? "Add" : "Take"} {formatCurrency(value, currency)}
      </Button>
    </div>
  );
};
