"use client";

import { useState } from "react";
import { Target } from "lucide-react";
import { Collapsible } from "@/components/Collapsible/Collapsible";
import { NumberInput } from "@/components/NumberInput/NumberInput";
import { Button } from "@/components/Button/Button";
import { useFinanceStore } from "@/store/financeStore";
import { useToast } from "@/hooks/useToast";
import { currentDateKey, formatCurrency, getCurrencySymbol } from "@/utils";
import { computeBudgetStatus } from "@/utils/spendPace";
import styles from "./SpendBudget.module.scss";

const asInput = (value?: number) => (value ? String(value) : "");

export const SpendBudget = () => {
  const spendBudget = useFinanceStore((s) => s.spendBudget);
  const setSpendBudget = useFinanceStore((s) => s.setSpendBudget);
  const currency = useFinanceStore((s) => s.profile?.currency ?? "INR");
  const toast = useToast();
  const symbol = getCurrencySymbol();

  const [open, setOpen] = useState(false);
  const [daily, setDaily] = useState(asInput(spendBudget?.daily));
  const [major, setMajor] = useState(asInput(spendBudget?.major));

  const dailyValue = Number(daily) || 0;
  const majorValue = Number(major) || 0;
  const changed =
    dailyValue !== (spendBudget?.daily ?? 0) ||
    majorValue !== (spendBudget?.major ?? 0);
  const perDay = computeBudgetStatus(
    {
      daily: dailyValue,
      major: 0,
      dailySince: spendBudget?.daily
        ? spendBudget.dailySince
        : currentDateKey(),
    },
    [],
  ).dailyShare;

  const save = () => {
    setSpendBudget({ daily: dailyValue, major: majorValue });
    toast({ title: "Spending budget saved", variant: "success" });
  };

  return (
    <Collapsible
      open={open}
      onToggle={setOpen}
      icon={<Target size={18} />}
      iconTone="amber"
      title="Spending budget"
      caption="Daily and major limits per month"
      trailing={
        <span className={styles.trail}>{spendBudget ? "On" : "Not set"}</span>
      }
    >
      <div className={styles.form}>
        <NumberInput
          label={`Daily spends per month (${symbol})`}
          inputMode="decimal"
          placeholder="No limit"
          value={daily}
          onChange={(e) => setDaily(e.target.value)}
          hint={
            perDay > 0
              ? `About ${formatCurrency(perDay, currency)} a day this month`
              : undefined
          }
        />
        <NumberInput
          label={`Major spends per month (${symbol})`}
          inputMode="decimal"
          placeholder="No limit"
          value={major}
          onChange={(e) => setMajor(e.target.value)}
        />
        <p className={styles.hint}>
          Rent, bills and EMIs don&apos;t count. Leave blank for no limit.
        </p>
        <Button fullWidth onClick={save} disabled={!changed}>
          Save budget
        </Button>
      </div>
    </Collapsible>
  );
};
