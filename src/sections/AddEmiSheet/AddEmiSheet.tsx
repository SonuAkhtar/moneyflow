"use client";

import { useId, useRef, useState } from "react";
import { differenceInCalendarMonths, getDaysInMonth, parseISO } from "date-fns";
import { Plus, X } from "lucide-react";
import { BottomSheet } from "@/components/BottomSheet/BottomSheet";
import { Button } from "@/components/Button/Button";
import { Input } from "@/components/Input/Input";
import { NumberInput } from "@/components/NumberInput/NumberInput";
import { Select } from "@/components/Select/Select";
import { SegmentedControl } from "@/components/SegmentedControl/SegmentedControl";
import { SheetActions } from "@/components/SheetActions/SheetActions";
import { ConfirmDialog } from "@/components/ConfirmDialog/ConfirmDialog";
import { FormStack } from "@/components/FormStack/FormStack";
import { useFinanceStore } from "@/store/financeStore";
import { useToast } from "@/hooks/useToast";
import {
  currentDateKey,
  currentMonthKey,
  emiInstalments,
  emiPaidAmount,
  emiPaidMonths,
  emiStartMonth,
  formatCurrency,
  getCurrencySymbol,
  monthLabel,
  shiftMonth,
  suggestedEmi,
} from "@/utils";
import type { Emi, EmiKind } from "@/types";
import styles from "./AddEmiSheet.module.scss";

const clampDay = (day: number, month: string) =>
  Math.min(getDaysInMonth(parseISO(`${month}-01`)), Math.max(1, day));

const startDateOf = (emi: Emi): string => {
  const month = emiStartMonth(emi);
  return `${month}-${String(clampDay(emi.dueDay || 1, month)).padStart(2, "0")}`;
};

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

const MONTH_RE = /^\d{4}-\d{2}$/;

const endMonthOf = (start: string, tenure: string): string => {
  const months = Math.floor(Number(tenure) || 0);
  return months > 0 ? shiftMonth(start, months - 1) : "";
};

const monthOfDate = (date: string) => date.slice(0, 7) || currentMonthKey();

interface ChangeRow {
  from: string;
  amount: string;
}

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
  const [startDate, setStartDate] = useState(
    emi ? startDateOf(emi) : currentDateKey(),
  );
  const [tenure, setTenure] = useState(emi ? intStr(emi.totalMonths) : "");
  const [endInput, setEndInput] = useState(() =>
    emi ? endMonthOf(emiStartMonth(emi), intStr(emi.totalMonths)) : "",
  );
  const [principal, setPrincipal] = useState(
    emi && isLoan ? intStr(emi.principal) : "",
  );
  const [rate, setRate] = useState(
    emi && isLoan ? intStr(emi.interestRate) : "",
  );
  const [changes, setChanges] = useState<ChangeRow[]>(
    (emi?.amountChanges ?? []).map((c) => ({
      from: c.from,
      amount: String(c.amount),
    })),
  );
  const loggedCount = emi ? emiInstalments(emi).length : 0;
  const paymentCount = emi?.payments?.length ?? 0;
  const editingSip = Boolean(emi) && !isLoan;
  const [paidMode, setPaidMode] = useState<PaidMode>(
    editingSip ? "amount" : "months",
  );
  const [paid, setPaid] = useState(
    emi
      ? editingSip
        ? intStr(emi.principal)
        : intStr(emiPaidMonths(emi))
      : "",
  );
  const [confirmOpen, setConfirmOpen] = useState(false);
  const submitted = useRef(false);
  const paidLabelId = useId();

  const refund = (emi?.payments ?? [])
    .filter((p) => p.accountId)
    .reduce((acc, p) => acc + p.amount, 0);
  const deleteMessage =
    `"${emi?.name ?? ""}"` +
    (paymentCount > 0
      ? ` and its ${paymentCount} logged payment${paymentCount === 1 ? "" : "s"} will be removed.`
      : " will be removed.") +
    (refund > 0
      ? ` ${formatCurrency(refund)} will be added back to your bank balance.`
      : "");

  const resolvedName = type === "Other" ? customName.trim() : type;

  const startMonth = monthOfDate(startDate);
  const tenureNum = Math.max(0, Math.floor(Number(tenure) || 0));
  const endMonth = endMonthOf(startMonth, tenure);
  const changeTenure = (value: string) => {
    setTenure(value);
    setEndInput(endMonthOf(startMonth, value));
  };
  const changeStartDate = (value: string) => {
    setStartDate(value);
    setEndInput(endMonthOf(monthOfDate(value), tenure));
  };
  const changeEndMonth = (value: string) => {
    setEndInput(value);
    if (!value) return setTenure("");
    if (!MONTH_RE.test(value)) return;
    const months =
      differenceInCalendarMonths(
        parseISO(`${value}-01`),
        parseISO(`${startMonth}-01`),
      ) + 1;
    if (months > 0) setTenure(String(months));
  };

  const paidTotal = emi ? emiPaidAmount(emi) : 0;
  const dueSoFar = Math.max(
    0,
    Math.min(
      tenureNum > 0 ? tenureNum : Infinity,
      differenceInCalendarMonths(
        parseISO(`${currentMonthKey()}-01`),
        parseISO(`${startMonth}-01`),
      ) + 1,
    ),
  );

  const loggedMonths = emi
    ? emiInstalments(emi)
        .map((p) => p.month)
        .sort()
    : [];
  const firstLogged = loggedMonths[0];
  const lastLogged = loggedMonths.at(-1);
  const startError =
    isLoan && firstLogged && startMonth > firstLogged
      ? `EMIs are logged from ${monthLabel(firstLogged)}`
      : undefined;
  const endError =
    endInput !== endMonth
      ? `Pick a month from ${monthLabel(startMonth)}`
      : isLoan && lastLogged && endMonth && endMonth < lastLogged
        ? `EMIs are logged up to ${monthLabel(lastLogged)}`
        : undefined;

  const rateNum = Number(rate) || 0;
  const rateError = rateNum > 100 ? "Enter a rate up to 100%" : undefined;
  const suggestion = suggestedEmi(Number(principal) || 0, rateNum, tenureNum);

  const changeError = (c: ChangeRow, i: number): string | undefined => {
    if (!MONTH_RE.test(c.from)) return "Pick a month";
    if (c.from < startMonth || (endMonth && c.from > endMonth))
      return endMonth
        ? `Pick a month between ${monthLabel(startMonth)} and ${monthLabel(endMonth)}`
        : `Pick a month from ${monthLabel(startMonth)}`;
    if (changes.some((o, j) => j < i && o.from === c.from))
      return "This month already has a change";
    if (!(Number(c.amount) > 0)) return "Enter an amount";
    return undefined;
  };
  const changesValid =
    !isLoan ||
    changes.every((c, i) => !changeError(c, i) && Number(c.amount) > 0);

  const canSave =
    Number(amount) > 0 &&
    Boolean(resolvedName) &&
    !(isLoan && (rateError || endError || startError)) &&
    changesValid;

  const updateChange = (i: number, patch: Partial<ChangeRow>) =>
    setChanges((rows) =>
      rows.map((r, j) => (j === i ? { ...r, ...patch } : r)),
    );
  const addChange = () => {
    const last = changes.at(-1)?.from;
    const next = last && MONTH_RE.test(last) ? shiftMonth(last, 12) : "";
    const thisMonth = currentMonthKey();
    const from =
      next ||
      (thisMonth > startMonth && (!endMonth || thisMonth <= endMonth)
        ? thisMonth
        : startMonth);
    setChanges((rows) => [...rows, { from, amount: "" }]);
  };

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
        paidMode === "amount"
          ? Math.max(0, Math.round(paidNum))
          : paidM * monthly;
      return {
        totalMonths: 0,
        paidMonths: paidM + loggedCount,
        remainingMonths: 0,
        principal: invested,
      };
    }
    const totalMonths = Math.max(0, Math.floor(Number(tenure) || 0));
    return {
      totalMonths,
      paidMonths: loggedCount,
      remainingMonths: Math.max(0, totalMonths - loggedCount),
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
    if (!canSave || submitted.current) return;
    submitted.current = true;
    const sched = schedule();
    const month = startMonth;
    const due =
      emi && startDate === startDateOf(emi)
        ? emi.dueDay
        : clampDay(Math.floor(Number(startDate.slice(8, 10)) || 1), month);
    const loanTerms = isLoan
      ? {
          principal: Number(principal) || 0,
          interestRate: rateNum,
          amountChanges: changes
            .map((c) => ({ from: c.from, amount: Number(c.amount) }))
            .sort((a, b) => a.from.localeCompare(b.from)),
        }
      : {};
    if (emi) {
      updateEmi(emi.id, {
        name: resolvedName,
        monthlyAmount: value,
        startMonth: month,
        dueDay: due,
        ...loanTerms,
        ...sched,
      });
      toast({
        title: "Updated",
        description: resolvedName,
        variant: "success",
      });
    } else {
      addEmi({
        name: resolvedName,
        kind,
        startMonth: month,
        monthlyAmount: value,
        principal: 0,
        interestRate: 0,
        dueDay: due,
        ...loanTerms,
        ...sched,
      });
      toast({ title: "Added", description: resolvedName, variant: "success" });
      setType(planTypes[0]!);
      setCustomName("");
      setAmount("");
      setStartDate(currentDateKey());
      setTenure("");
      setEndInput("");
      setPrincipal("");
      setRate("");
      setChanges([]);
      setPaid("");
      setPaidMode("months");
    }
    onClose();
  };

  const amountField = (
    <div className={styles.group}>
      <NumberInput
        label={
          isLoan ? `Monthly EMI (${symbol})` : `Monthly amount (${symbol})`
        }
        inputMode="decimal"
        placeholder="0"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
      />
      {isLoan && suggestion > 0 && suggestion !== Number(amount) && (
        <button
          type="button"
          className={styles.suggest}
          onClick={() => setAmount(String(suggestion))}
        >
          Suggested EMI {formatCurrency(suggestion)} · <strong>Use</strong>
        </button>
      )}
    </div>
  );

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

        {isLoan && (
          <div className={styles.row}>
            <NumberInput
              label={`Loan amount (${symbol})`}
              inputMode="decimal"
              placeholder="Optional"
              value={principal}
              onChange={(e) => setPrincipal(e.target.value)}
            />
            <NumberInput
              label="Interest (% p.a.)"
              inputMode="decimal"
              placeholder="Optional"
              value={rate}
              onChange={(e) => setRate(e.target.value)}
              error={rateError}
            />
          </div>
        )}

        {!isLoan && amountField}

        {!isLoan && (
          <Input
            label="Investing since"
            type="date"
            value={startDate}
            onChange={(e) => changeStartDate(e.target.value)}
            hint="The day of this date sets the monthly due day"
          />
        )}

        {isLoan && (
          <>
            <div className={styles.row}>
              <Input
                label="Start date"
                type="date"
                value={startDate}
                onChange={(e) => changeStartDate(e.target.value)}
                hint="Sets the due day"
                error={startError}
              />
              <Input
                label="End month"
                type="month"
                placeholder="YYYY-MM"
                min={startMonth}
                value={endInput}
                onChange={(e) => changeEndMonth(e.target.value)}
                error={endError}
              />
            </div>

            <div className={styles.row}>
              <NumberInput
                label="Tenure (months)"
                inputMode="numeric"
                placeholder="0"
                value={tenure}
                onChange={(e) => changeTenure(e.target.value)}
              />
              {amountField}
            </div>

            <div className={styles.group}>
              <div className={styles.paid_top}>
                <span className={styles.paid_label}>EMI changes</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  icon={Plus}
                  onClick={addChange}
                >
                  Add change
                </Button>
              </div>
              {changes.length === 0 ? (
                <span className={styles.note}>
                  For rate revisions or step-ups: a new EMI from a month onward.
                </span>
              ) : (
                changes.map((c, i) => {
                  const error = changeError(c, i);
                  return (
                    <div key={i} className={styles.change}>
                      <div className={styles.change_row}>
                        <Input
                          aria-label={`Change ${i + 1} from month`}
                          type="month"
                          placeholder="YYYY-MM"
                          min={startMonth}
                          max={endMonth || undefined}
                          value={c.from}
                          onChange={(e) =>
                            updateChange(i, { from: e.target.value })
                          }
                        />
                        <NumberInput
                          aria-label={`Change ${i + 1} EMI amount`}
                          inputMode="decimal"
                          placeholder={`${symbol}0`}
                          value={c.amount}
                          onChange={(e) =>
                            updateChange(i, { amount: e.target.value })
                          }
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          icon={X}
                          aria-label={`Remove change ${i + 1}`}
                          onClick={() =>
                            setChanges((rows) => rows.filter((_, j) => j !== i))
                          }
                        />
                      </div>
                      {error && (
                        <span role="alert" className={styles.change_error}>
                          {error}
                        </span>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </>
        )}

        {isLoan ? (
          isEdit && (
            <div className={styles.paid} aria-live="polite">
              <span className={styles.paid_label}>Paid so far</span>
              <span className={styles.note}>
                {loggedCount > 0
                  ? `${loggedCount} EMI${loggedCount === 1 ? "" : "s"} logged · ${formatCurrency(paidTotal)}`
                  : "No EMIs logged yet"}
                {dueSoFar > 0 &&
                  ` · ${dueSoFar} due since ${monthLabel(startMonth)}`}
              </span>
            </div>
          )
        ) : (
          <div className={styles.paid}>
            <div className={styles.paid_top}>
              <span id={paidLabelId} className={styles.paid_label}>
                {loggedCount > 0
                  ? "Invested before logged payments"
                  : "Invested so far"}
              </span>
              <SegmentedControl
                size="sm"
                aria-labelledby={paidLabelId}
                segments={PAID_MODES}
                value={paidMode}
                onChange={switchPaidMode}
              />
            </div>
            <NumberInput
              aria-labelledby={paidLabelId}
              inputMode={paidMode === "amount" ? "decimal" : "numeric"}
              placeholder={
                paidMode === "amount" ? `${symbol}0` : "Number of months"
              }
              value={paid}
              onChange={(e) => setPaid(e.target.value)}
            />
          </div>
        )}
      </FormStack>

      <ConfirmDialog
        open={confirmOpen}
        title="Delete this entry?"
        message={deleteMessage}
        confirmLabel="Delete"
        onConfirm={confirmDelete}
        onCancel={() => setConfirmOpen(false)}
      />
    </BottomSheet>
  );
};
