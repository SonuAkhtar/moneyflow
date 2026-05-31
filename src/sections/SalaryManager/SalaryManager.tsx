"use client";

import { useMemo, useState } from "react";
import { Plus, Wallet } from "lucide-react";
import { Collapsible } from "@/components/Collapsible/Collapsible";
import { BottomSheet } from "@/components/BottomSheet/BottomSheet";
import { AmountField } from "@/components/AmountField/AmountField";
import { SheetActions } from "@/components/SheetActions/SheetActions";
import { useFinanceStore } from "@/store/financeStore";
import { salaryTotalsByMonth } from "@/store/finance/selectors";
import { useToast } from "@/hooks/useToast";
import {
  currentMonthKey,
  formatCurrency,
  lastNMonthKeys,
  monthKey,
  monthLabel,
} from "@/utils";
import styles from "./SalaryManager.module.scss";

export const SalaryManager = () => {
  const transactions = useFinanceStore((s) => s.transactions);
  const accounts = useFinanceStore((s) => s.accounts);
  const setSalary = useFinanceStore((s) => s.setSalary);
  const deleteTransaction = useFinanceStore((s) => s.deleteTransaction);
  const currency = useFinanceStore((s) => s.profile?.currency ?? "INR");
  const toast = useToast();

  const [open, setOpen] = useState(false);
  const [editMonth, setEditMonth] = useState<string | null>(null);
  const [amount, setAmount] = useState("");

  const salaryByMonth = useMemo(
    () => salaryTotalsByMonth(transactions),
    [transactions],
  );

  const months = useMemo(() => lastNMonthKeys(7).reverse(), []);
  const current = currentMonthKey();

  const openEditor = (month: string) => {
    setEditMonth(month);
    setAmount(salaryByMonth[month] ? String(salaryByMonth[month]) : "");
  };

  const save = () => {
    if (!editMonth) return;
    if (accounts.length === 0) {
      toast({
        title: "Add an account first",
        description:
          "Salary is credited to an account - create one to track it.",
        variant: "error",
      });
      return;
    }
    setSalary(editMonth, Number(amount) || 0);
    toast({
      title: "Salary updated",
      description: monthLabel(editMonth),
      variant: "success",
    });
    setEditMonth(null);
  };

  const remove = () => {
    if (!editMonth) return;
    transactions
      .filter(
        (t) =>
          t.type === "income" &&
          t.category === "salary" &&
          monthKey(t.occurredAt) === editMonth,
      )
      .forEach((t) => deleteTransaction(t.id));
    toast({
      title: "Salary removed",
      description: monthLabel(editMonth),
      variant: "info",
    });
    setEditMonth(null);
  };

  const editorHasValue = editMonth
    ? (salaryByMonth[editMonth] ?? 0) > 0
    : false;

  return (
    <>
      <Collapsible
        open={open}
        onToggle={setOpen}
        icon={<Wallet size={18} />}
        title="Monthly salary"
        caption="Current Month & Last 6 Months"
        trailing={formatCurrency(salaryByMonth[current] ?? 0, currency)}
      >
        <div className={styles.list}>
          {months.map((month) => {
            const value = salaryByMonth[month] ?? 0;
            const isCurrent = month === current;
            return (
              <button
                key={month}
                type="button"
                className={styles.row}
                onClick={() => openEditor(month)}
              >
                <span className={styles.row_month}>
                  {monthLabel(month)}
                  {isCurrent && <span className={styles.row_tag}>Current</span>}
                </span>
                {value > 0 ? (
                  <span className={styles.row_value}>
                    {formatCurrency(value, currency)}
                  </span>
                ) : (
                  <span className={styles.row_add}>
                    <Plus size={14} />
                    Add
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </Collapsible>

      <BottomSheet
        open={editMonth !== null}
        onClose={() => setEditMonth(null)}
        title={`${editorHasValue ? "Edit" : "Add"} Salary - ${
          editMonth ? monthLabel(editMonth) : ""
        }`}
      >
        <div className={styles.editor}>
          <AmountField value={amount} onChange={setAmount} />
          <SheetActions
            onSave={save}
            onDelete={editorHasValue ? remove : undefined}
            saveLabel="Save salary"
          />
        </div>
      </BottomSheet>
    </>
  );
};
