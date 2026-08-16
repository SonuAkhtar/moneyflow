"use client";

import { useMemo } from "react";
import { Check, CreditCard, HandCoins, TrendingUp } from "lucide-react";
import { Card } from "@/components/Card/Card";
import { SectionHeader } from "@/components/SectionHeader/SectionHeader";
import { useFinanceStore } from "@/store/financeStore";
import {
  borrowingOutstanding,
  borrowingSettled,
  currentMonthKey,
  dayShort,
  emiKind,
  formatCurrency,
  monthLabel,
} from "@/utils";
import styles from "./ComingUp.module.scss";

interface DueItem {
  id: string;
  label: string;
  amount: number;
  date: Date;
  type: "loan" | "sip" | "borrow";
  paid: boolean;
}

const clampToMonth = (year: number, month: number, dueDay: number): Date => {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const day = Math.min(Math.max(1, dueDay || 1), daysInMonth);
  return new Date(year, month, day);
};

const nextDueDate = (dueDay: number): Date => {
  const now = new Date();
  const candidate = clampToMonth(now.getFullYear(), now.getMonth(), dueDay);
  const todayMidnight = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  );
  if (candidate.getTime() < todayMidnight.getTime()) {
    return clampToMonth(now.getFullYear(), now.getMonth() + 1, dueDay);
  }
  return candidate;
};

const daysUntil = (date: Date): number => {
  const now = new Date();
  const a = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const b = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  return Math.round((b.getTime() - a.getTime()) / 86400000);
};

const META = {
  loan: { icon: CreditCard, color: "var(--color-danger)" },
  sip: { icon: TrendingUp, color: "var(--color-success)" },
  borrow: { icon: HandCoins, color: "var(--color-warning)" },
} as const;

export const ComingUp = () => {
  const emis = useFinanceStore((s) => s.emis);
  const borrowings = useFinanceStore((s) => s.borrowings);
  const currency = useFinanceStore((s) => s.profile?.currency ?? "INR");

  const thisMonth = currentMonthKey();

  const items = useMemo<DueItem[]>(() => {
    const out: DueItem[] = [];
    for (const e of emis) {
      if (e.status !== "active") continue;
      out.push({
        id: e.id,
        label: e.name,
        amount: e.monthlyAmount,
        date: nextDueDate(e.dueDay),
        type: emiKind(e),
        paid: (e.payments ?? []).some((p) => p.month === thisMonth),
      });
    }
    for (const b of borrowings) {
      if (!b.dueDate || borrowingSettled(b)) continue;
      out.push({
        id: b.id,
        label: b.lender,
        amount: borrowingOutstanding(b),
        date: new Date(b.dueDate),
        type: "borrow",
        paid: false,
      });
    }
    return out.sort((x, y) => x.date.getTime() - y.date.getTime()).slice(0, 4);
  }, [emis, borrowings, thisMonth]);

  if (items.length === 0) return null;

  return (
    <section>
      <SectionHeader title="Upcoming payments" caption="EMIs, SIPs & dues" />
      <Card surface="solid" padded={false} className={styles.list}>
        {items.map((item) => {
          const meta = META[item.type];
          const Icon = meta.icon;
          const days = daysUntil(item.date);
          const when =
            days <= 0
              ? "Due today"
              : days === 1
                ? "Tomorrow"
                : `In ${days} days`;
          return (
            <div key={item.id} className={styles.row}>
              <span className={styles.row_icon} style={{ color: meta.color }}>
                <Icon size={17} />
              </span>
              <span className={styles.row_info}>
                <span className={styles.row_name}>{item.label}</span>
                {item.paid ? (
                  <span className={styles.row_paid}>
                    <Check size={12} />
                    Paid · {monthLabel(thisMonth)}
                  </span>
                ) : (
                  <span className={styles.row_when}>
                    {dayShort(item.date)} · {when}
                  </span>
                )}
              </span>
              <span className={styles.row_amount} style={{ color: meta.color }}>
                {formatCurrency(item.amount, currency)}
              </span>
            </div>
          );
        })}
      </Card>
    </section>
  );
};
