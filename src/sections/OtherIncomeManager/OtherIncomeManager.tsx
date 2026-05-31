"use client";

import { useMemo, useState } from "react";
import { HandCoins, Plus } from "lucide-react";
import { Collapsible } from "@/components/Collapsible/Collapsible";
import { AddIncomeSheet } from "@/sections/AddIncomeSheet/AddIncomeSheet";
import { useFinanceStore } from "@/store/financeStore";
import { getCategoryMeta } from "@/constants/categories";
import { currentMonthKey, formatCurrency, monthKey, sumBy } from "@/utils";
import type { Transaction } from "@/types";
import styles from "./OtherIncomeManager.module.scss";

const dayLabel = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short" });

export const OtherIncomeManager = () => {
  const transactions = useFinanceStore((s) => s.transactions);
  const currency = useFinanceStore((s) => s.profile?.currency ?? "INR");

  const [open, setOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<Transaction | null>(null);

  const items = useMemo(
    () =>
      transactions
        .filter((t) => t.type === "income" && t.category !== "salary")
        .sort((a, b) => +new Date(b.occurredAt) - +new Date(a.occurredAt)),
    [transactions],
  );

  const month = currentMonthKey();
  const thisMonthTotal = sumBy(
    items.filter((t) => monthKey(t.occurredAt) === month),
    (t) => t.amount,
  );

  return (
    <>
      <Collapsible
        open={open}
        onToggle={setOpen}
        icon={<HandCoins size={18} />}
        title="Other income"
        caption="Bonuses, refunds, freelance & more"
        trailing={
          <span className={styles.total}>
            {formatCurrency(thisMonthTotal, currency)}
          </span>
        }
      >
        <div className={styles.list}>
          <button
            type="button"
            className={styles.add}
            onClick={() => setAddOpen(true)}
          >
            <Plus size={16} />
            Add income
          </button>

          {items.map((t) => {
                const meta = getCategoryMeta(t.category);
                const Icon = meta.icon;
                return (
                  <button
                    key={t.id}
                    type="button"
                    className={styles.row}
                    onClick={() => setEditing(t)}
                  >
                    <span
                      className={styles.row_icon}
                      style={{ color: meta.color }}
                    >
                      <Icon size={16} />
                    </span>
                    <span className={styles.row_text}>
                      <span className={styles.row_label}>
                        {t.note || meta.label}
                      </span>
                      <span className={styles.row_sub}>
                        {meta.label} · {dayLabel(t.occurredAt)}
                      </span>
                    </span>
                    <span className={styles.row_value}>
                      +{formatCurrency(t.amount, currency)}
                    </span>
                  </button>
                );
              })}
        </div>
      </Collapsible>

      <AddIncomeSheet open={addOpen} onClose={() => setAddOpen(false)} />
      <AddIncomeSheet
        open={editing !== null}
        transaction={editing}
        onClose={() => setEditing(null)}
      />
    </>
  );
};
