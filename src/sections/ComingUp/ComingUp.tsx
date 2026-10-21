"use client";

import { useMemo, type CSSProperties } from "react";
import { format, parseISO } from "date-fns";
import { Check, CreditCard, HandCoins, TrendingUp } from "lucide-react";
import { useFinanceStore } from "@/store/financeStore";
import {
  borrowingOutstanding,
  borrowingSettled,
  cn,
  currentMonthKey,
  dayShort,
  emiKind,
  formatCurrency,
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

const dueDateThisMonth = (dueDay: number): Date => {
  const now = new Date();
  return clampToMonth(now.getFullYear(), now.getMonth(), dueDay);
};

const daysUntil = (date: Date): number => {
  const now = new Date();
  const a = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const b = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  return Math.round((b.getTime() - a.getTime()) / 86400000);
};

const META = {
  loan: { icon: CreditCard, color: "var(--color-danger)", label: "Loan EMI" },
  sip: { icon: TrendingUp, color: "var(--color-success)", label: "SIP" },
  borrow: { icon: HandCoins, color: "var(--color-warning)", label: "Borrowed" },
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
        date: dueDateThisMonth(e.dueDay),
        type: emiKind(e),
        paid: (e.payments ?? []).some((p) => p.month === thisMonth),
      });
    }
    for (const b of borrowings) {
      if (!b.dueDate || borrowingSettled(b)) continue;
      if (b.dueDate.slice(0, 7) !== thisMonth) continue;
      out.push({
        id: b.id,
        label: b.lender,
        amount: borrowingOutstanding(b),
        date: parseISO(b.dueDate),
        type: "borrow",
        paid: false,
      });
    }
    return out.sort((x, y) => x.date.getTime() - y.date.getTime()).slice(0, 4);
  }, [emis, borrowings, thisMonth]);

  if (items.length === 0) return null;

  const dueTotal = items
    .filter((i) => !i.paid)
    .reduce((acc, i) => acc + i.amount, 0);

  return (
    <section className={styles.section} aria-labelledby="coming-up-title">
      <div className={styles.head}>
        <div>
          <h2 id="coming-up-title" className={styles.head_title}>
            Upcoming payments
          </h2>
          <p className={styles.head_caption}>EMIs, SIPs & dues</p>
        </div>
        {dueTotal > 0 && (
          <div className={styles.total}>
            <span className={styles.total_label}>Due</span>
            <span className={styles.total_value}>
              {formatCurrency(dueTotal, currency)}
            </span>
          </div>
        )}
      </div>

      <ul
        className={styles.rail}
        tabIndex={0}
        aria-label="Upcoming payments, scroll for more"
      >
        {items.map((item) => {
          const meta = META[item.type];
          const Icon = meta.icon;
          const days = daysUntil(item.date);
          const urgency = days < 0 ? "overdue" : days <= 3 ? "soon" : "later";
          const when =
            days < 0
              ? `Overdue ${-days}d`
              : days === 0
                ? "Due today"
                : days === 1
                  ? "Tomorrow"
                  : `In ${days} days`;
          return (
            <li
              key={item.id}
              className={cn(
                styles.ticket,
                item.paid ? styles["ticket--paid"] : styles["ticket--pending"],
              )}
              style={{ "--tone": meta.color } as CSSProperties}
            >
              <span className={styles.cal} aria-hidden>
                <span className={styles.cal_month}>
                  {format(item.date, "MMM")}
                </span>
                <span className={styles.cal_day}>{format(item.date, "d")}</span>
              </span>
              <span className={styles.ticket_info}>
                <span className={styles.ticket_name}>
                  <Icon size={12} className={styles.ticket_icon} aria-hidden />
                  <span className="sr-only">{meta.label}: </span>
                  <span className={styles.ticket_label}>{item.label}</span>
                </span>
                <span className={styles.ticket_amount}>
                  {formatCurrency(item.amount, currency)}
                </span>
                {!item.paid && (
                  <span
                    className={cn(styles.when, styles[`when--${urgency}`])}
                    title={dayShort(item.date)}
                  >
                    {when}
                  </span>
                )}
              </span>
              {item.paid && (
                <span className={styles.paid} role="img" aria-label="Paid">
                  <Check size={15} strokeWidth={3} aria-hidden />
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
};
