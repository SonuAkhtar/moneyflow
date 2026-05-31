"use client";

import { useState } from "react";
import { BottomSheet } from "@/components/BottomSheet/BottomSheet";
import { Input } from "@/components/Input/Input";
import { Select } from "@/components/Select/Select";
import { SegmentedControl } from "@/components/SegmentedControl/SegmentedControl";
import { SheetActions } from "@/components/SheetActions/SheetActions";
import { ConfirmDialog } from "@/components/ConfirmDialog/ConfirmDialog";
import { FormStack } from "@/components/FormStack/FormStack";
import { useFinanceStore } from "@/store/financeStore";
import { useToast } from "@/hooks/useToast";
import {
  currentMonthKey,
  emiPaidMonths,
  emiStartMonth,
  getCurrencySymbol,
} from "@/utils";
import type { Emi, EmiKind } from "@/types";
import styles from "./AddEmiSheet.module.scss";

interface AddEmiSheetProps {
  open: boolean;
  onClose: () => void;
  kind: EmiKind;
  emi?: Emi | null;
}

const TYPES_BY_KIND: Record<EmiKind, string[]> = {
  loan: ["Home Loan", "Car Loan", "Mobile Loan", "Laptop Loan", "Other"],
  sip: ["SIP", "Mutual Funds", "Other"],
};

const COPY: Record<EmiKind, { add: string; edit: string }> = {
  loan: { add: "Add Loan EMI", edit: "Edit Loan EMI" },
  sip: { add: "Add SIP", edit: "Edit SIP" },
};

const intStr = (n: number) => (n > 0 ? String(n) : "");

type PaidMode = "months" | "amount";
const PAID_MODES: { label: string; value: PaidMode }[] = [
  { label: "Months", value: "months" },
  { label: "Amount", value: "amount" },
];

export const AddEmiSheet = ({ open, onClose, kind, emi }: AddEmiSheetProps) => {
  const addEmi = useFinanceStore((s) => s.addEmi);
  const updateEmi = useFinanceStore((s) => s.updateEmi);
  const deleteEmi = useFinanceStore((s) => s.deleteEmi);
  const toast = useToast();
  const symbol = getCurrencySymbol();
  const isEdit = Boolean(emi);
  const isLoan = kind === "loan";

  const planTypes = TYPES_BY_KIND[kind];
  const isKnownType = (n: string) => planTypes.includes(n);

  const [type, setType] = useState(
    emi ? (isKnownType(emi.name) ? emi.name : "Other") : planTypes[0]!,
  );
  const [customName, setCustomName] = useState(
    emi && !isKnownType(emi.name) ? emi.name : "",
  );
  const [amount, setAmount] = useState(emi ? String(emi.monthlyAmount) : "");
  const [startMonth, setStartMonth] = useState(
    emi ? emiStartMonth(emi) : currentMonthKey(),
  );
  const [tenure, setTenure] = useState(emi ? intStr(emi.totalMonths) : "");
  const [dueDay, setDueDay] = useState(emi ? intStr(emi.dueDay) : "");
  const [paidMode, setPaidMode] = useState<PaidMode>("months");
  const [paid, setPaid] = useState(emi ? intStr(emiPaidMonths(emi)) : "");
  const [confirmOpen, setConfirmOpen] = useState(false);

  const resolvedName = type === "Other" ? customName.trim() : type;
  const canSave = Boolean(Number(amount)) && Boolean(resolvedName);

  const switchPaidMode = (mode: PaidMode) => {
    if (mode === paidMode) return;
    const monthly = Number(amount) || 0;
    const cur = Number(paid) || 0;
    if (monthly > 0 && cur > 0) {
      setPaid(
        mode === "amount"
          ? String(Math.round(cur * monthly))
          : String(Math.round(cur / monthly)),
      );
    }
    setPaidMode(mode);
  };

  const schedule = () => {
    const monthly = Number(amount) || 0;
    const paidNum = Number(paid) || 0;
    const paidRaw =
      paidMode === "amount"
        ? monthly > 0
          ? Math.round(paidNum / monthly)
          : 0
        : Math.floor(paidNum);
    const paidM = Math.max(0, paidRaw);
    if (!isLoan) {
      const invested =
        paidMode === "amount" ? Math.max(0, Math.round(paidNum)) : paidM * monthly;
      return {
        totalMonths: 0,
        paidMonths: paidM,
        remainingMonths: 0,
        principal: invested,
      };
    }
    const totalMonths = Math.max(0, Math.floor(Number(tenure) || 0));
    const paidMonths = totalMonths > 0 ? Math.min(paidM, totalMonths) : paidM;
    return {
      totalMonths,
      paidMonths,
      remainingMonths: Math.max(0, totalMonths - paidMonths),
    };
  };

  const confirmDelete = () => {
    if (!emi) return;
    deleteEmi(emi.id);
    toast({ title: "Removed", variant: "info" });
    setConfirmOpen(false);
    onClose();
  };

  const submit = () => {
    const value = Number(amount);
    if (!value || !resolvedName) return;
    const sched = schedule();
    const month = startMonth || currentMonthKey();
    const due = Math.min(31, Math.max(1, Math.floor(Number(dueDay) || 1)));
    if (emi) {
      updateEmi(emi.id, {
        name: resolvedName,
        monthlyAmount: value,
        startMonth: month,
        dueDay: due,
        ...sched,
      });
      toast({ title: "Updated", description: resolvedName, variant: "success" });
    } else {
      addEmi({
        name: resolvedName,
        kind,
        startMonth: month,
        monthlyAmount: value,
        principal: 0,
        interestRate: 0,
        dueDay: due,
        ...sched,
      });
      toast({ title: "Added", description: resolvedName, variant: "success" });
      setType(planTypes[0]!);
      setCustomName("");
      setAmount("");
      setStartMonth(currentMonthKey());
      setTenure("");
      setDueDay("");
      setPaid("");
      setPaidMode("months");
    }
    onClose();
  };

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title={isEdit ? COPY[kind].edit : COPY[kind].add}
      footer={
        <SheetActions
          onSave={submit}
          onDelete={isEdit ? () => setConfirmOpen(true) : undefined}
          saveLabel={isEdit ? "Save changes" : "Add"}
          disabled={!canSave}
        />
      }
    >
      <FormStack>
        <Select
          label="Type"
          value={type}
          onChange={(e) => setType(e.target.value)}
          options={planTypes.map((t) => ({ label: t, value: t }))}
        />

        {type === "Other" && (
          <Input
            label="Name"
            placeholder={isLoan ? "e.g. Personal loan" : "e.g. Index fund"}
            value={customName}
            onChange={(e) => setCustomName(e.target.value)}
          />
        )}

        <Input
          label={`Monthly amount (${symbol})`}
          type="number"
          inputMode="decimal"
          placeholder="0"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />

        <Input
          label={isLoan ? "Started (month & year)" : "Investing since (month & year)"}
          type="month"
          value={startMonth}
          onChange={(e) => setStartMonth(e.target.value)}
        />

        <Input
          label="Due day of month (1–31)"
          type="number"
          inputMode="numeric"
          placeholder="e.g. 5"
          value={dueDay}
          onChange={(e) => setDueDay(e.target.value)}
        />

        {isLoan && (
          <Input
            label="Tenure (months)"
            type="number"
            inputMode="numeric"
            placeholder="0"
            value={tenure}
            onChange={(e) => setTenure(e.target.value)}
          />
        )}

        <div className={styles.paid}>
          <div className={styles.paid_top}>
            <span className={styles.paid_label}>
              {isLoan ? "Paid so far" : "Invested so far"}
            </span>
            <SegmentedControl
              size="sm"
              segments={PAID_MODES}
              value={paidMode}
              onChange={switchPaidMode}
            />
          </div>
          <Input
            type="number"
            inputMode={paidMode === "amount" ? "decimal" : "numeric"}
            placeholder={
              paidMode === "amount" ? `${symbol}0` : "Number of months"
            }
            value={paid}
            onChange={(e) => setPaid(e.target.value)}
          />
        </div>
      </FormStack>

      <ConfirmDialog
        open={confirmOpen}
        title="Delete this entry?"
        message={`"${emi?.name ?? ""}" will be removed.`}
        confirmLabel="Delete"
        onConfirm={confirmDelete}
        onCancel={() => setConfirmOpen(false)}
      />
    </BottomSheet>
  );
};
