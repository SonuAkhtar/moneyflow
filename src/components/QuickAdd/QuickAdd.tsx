"use client";

import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { AddExpenseSheet } from "@/sections/AddExpenseSheet/AddExpenseSheet";
import { useFinanceStore } from "@/store/financeStore";
import { cn } from "@/utils";
import styles from "./QuickAdd.module.scss";

export const QuickAdd = () => {
  const [open, setOpen] = useState(false);
  const dailyAccountId = useFinanceStore((s) => s.dailyAccountId);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    let last = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY;
      if (Math.abs(y - last) < 8) return;
      setHidden(y > last && y > 80);
      last = y;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <>
      <button
        type="button"
        className={cn(styles.fab, hidden && styles["fab--hidden"])}
        onClick={() => setOpen(true)}
        aria-label="Add expense"
        aria-haspopup="dialog"
      >
        <Plus size={24} strokeWidth={2.4} />
      </button>
      <AddExpenseSheet
        open={open}
        onClose={() => setOpen(false)}
        title="Add expense"
        accountId={dailyAccountId ?? undefined}
        kindSelectable
      />
    </>
  );
};
