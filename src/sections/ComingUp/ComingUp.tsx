"use client";

import { useMemo } from "react";
import { format, parseISO } from "date-fns";
import { AlertCircle, Check, Clock } from "lucide-react";
import { useFinanceStore } from "@/store/financeStore";
import {
  borrowingOutstanding,
  borrowingSettled,
  cn,
  currentMonthKey,
  dayShort,
  emiAmountFor,
  emiCanLogMonth,
  emiInstalments,
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
  loan: { tone: "bank", label: "Loan EMI" },
  sip: { tone: "sip", label: "SIP" },
  borrow: { tone: "borrow", label: "Borrowed" },
} as const;

const STATUS_ICON = { paid: Check, upcoming: Clock, overdue: AlertCircle };
const STATUS_LABEL = { paid: "Paid", upcoming: "Upcoming", overdue: "Overdue" };

export const ComingUp = () => {
  const emis = useFinanceStore((s) => s.emis);
  const borrowings = useFinanceStore((s) => s.borrowings);
  const currency = useFinanceStore((s) => s.profile?.currency ?? "INR");

  const thisMonth = currentMonthKey();

  const { items, dueTotal } = useMemo(() => {
    const out: DueItem[] = [];
    for (const e of emis) {
      if (e.status !== "active" || !emiCanLogMonth(e, thisMonth)) continue;
      out.push({
        id: e.id,
        label: e.name,
        amount: emiAmountFor(e, thisMonth),
        date: dueDateThisMonth(e.dueDay),
        type: emiKind(e),
        paid: emiInstalments(e).some((p) => p.month === thisMonth),
      });
    }
    for (const b of borrowings) {
      if (!b.dueDate || borrowingSettled(b)) continue;
      if (b.dueDate.slice(0, 7) > thisMonth) continue;
      out.push({
        id: b.id,
        label: b.lender,
        amount: borrowingOutstanding(b),
        date: parseISO(b.dueDate),
        type: "borrow",
        paid: false,
      });
    }
    const unpaid = out.filter((i) => !i.paid);
    const byDate = (x: DueItem, y: DueItem) =>
      x.date.getTime() - y.date.getTime();
    return {
      items: [...unpaid.sort(byDate), ...out.filter((i) => i.paid).sort(byDate)]
        .slice(0, 4)
        .sort(byDate),
      dueTotal: unpaid.reduce((acc, i) => acc + i.amount, 0),
    };
  }, [emis, borrowings, thisMonth]);

  if (items.length === 0) return null;

  return (
    <section className={styles.section} aria-labelledby="coming-up-title">
      <div className={styles.head}>
        <h2 id="coming-up-title" className={styles.head_title}>
          Upcoming payments
        </h2>
        {dueTotal > 0 && (
          <span className={styles.head_due}>
            <strong>{formatCurrency(dueTotal, currency)}</strong> due
          </span>
        )}
      </div>

      <ul
        className={styles.rail}
        tabIndex={0}
        aria-label="Upcoming payments, scroll for more"
      >
        {items.map((item) => {
          const meta = META[item.type];
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
          const status = item.paid ? "paid" : days < 0 ? "overdue" : "upcoming";
          const StatusIcon = STATUS_ICON[status];
          return (
            <li
              key={item.id}
              className={cn(
                styles.tile,
                styles[`tile--${meta.tone}`],
                styles[`tile--${status}`],
              )}
            >
              <span className={styles.date} aria-hidden>
                <span className={styles.date_month}>
                  {format(item.date, "MMM")}
                </span>
                <span className={styles.date_day}>
                  {format(item.date, "d")}
                </span>
              </span>
              <span className={styles.info}>
                <span className={styles.info_name}>
                  <span className="sr-only">{meta.label}: </span>
                  {item.label}
                </span>
                <span className={styles.info_amount}>
                  {formatCurrency(item.amount, currency)}
                </span>
                {item.paid ? (
                  <span className={styles.paid}>Paid</span>
                ) : (
                  <span
                    className={cn(styles.when, styles[`when--${urgency}`])}
                    title={dayShort(item.date)}
                  >
                    {when}
                  </span>
                )}
              </span>
              <span
                className={styles.status}
                role="img"
                aria-label={STATUS_LABEL[status]}
              >
                <StatusIcon size={15} strokeWidth={2.6} aria-hidden />
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
};
