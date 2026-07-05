"use client";

import { useState } from "react";
import { BottomSheet } from "@/components/BottomSheet/BottomSheet";
import { Input } from "@/components/Input/Input";
import { Button } from "@/components/Button/Button";
import { useFinanceStore } from "@/store/financeStore";
import { useToast } from "@/hooks/useToast";
import { EXPENSE_CATEGORIES, getCategoryMeta } from "@/constants/categories";
import { getCurrencySymbol } from "@/utils";
import type { CategoryId } from "@/types";
import styles from "./BudgetSheet.module.scss";

interface BudgetSheetProps {
  open: boolean;
  onClose: () => void;
}

export const BudgetSheet = ({ open, onClose }: BudgetSheetProps) => (
  <BottomSheet open={open} onClose={onClose} title="Monthly budgets">
    {open && <Form onClose={onClose} />}
  </BottomSheet>
);

const Form = ({ onClose }: { onClose: () => void }) => {
  const budgets = useFinanceStore((s) => s.budgets);
  const setBudget = useFinanceStore((s) => s.setBudget);
  const toast = useToast();
  const symbol = getCurrencySymbol();

  const [draft, setDraft] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      EXPENSE_CATEGORIES.map((id) => [
        id,
        budgets[id] ? String(budgets[id]) : "",
      ]),
    ),
  );

  const save = () => {
    for (const id of EXPENSE_CATEGORIES) {
      setBudget(id as CategoryId, Number(draft[id]) || 0);
    }
    toast({ title: "Budgets saved", variant: "success" });
    onClose();
  };

  return (
    <div className={styles.form}>
      <p className={styles.hint}>
        Set a monthly limit per category. Leave blank for no limit.
      </p>
      <div className={styles.list}>
        {EXPENSE_CATEGORIES.map((id) => {
          const meta = getCategoryMeta(id);
          const Icon = meta.icon;
          return (
            <div key={id} className={styles.item}>
              <span
                className={styles.item_icon}
                style={{ background: `${meta.color}1f`, color: meta.color }}
              >
                <Icon size={16} />
              </span>
              <Input
                className={styles.item_input}
                label={meta.label}
                type="number"
                inputMode="decimal"
                placeholder={`No limit (${symbol})`}
                value={draft[id] ?? ""}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, [id]: e.target.value }))
                }
              />
            </div>
          );
        })}
      </div>
      <Button size="lg" fullWidth onClick={save}>
        Save budgets
      </Button>
    </div>
  );
};
