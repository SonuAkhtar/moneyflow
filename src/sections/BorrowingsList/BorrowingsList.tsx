"use client";

import { useState } from "react";
import { AnimatePresence, m } from "framer-motion";
import { CheckCircle2, ChevronRight, HandCoins, Plus } from "lucide-react";
import { Card } from "@/components/Card/Card";
import { ProgressBar } from "@/components/ProgressBar/ProgressBar";
import { Badge } from "@/components/Badge/Badge";
import { AddBorrowingSheet } from "@/sections/AddBorrowingSheet/AddBorrowingSheet";
import { AddBorrowingPaymentSheet } from "@/sections/AddBorrowingPaymentSheet/AddBorrowingPaymentSheet";
import { useFinanceStore } from "@/store/financeStore";
import {
  borrowingOutstanding,
  borrowingRepaid,
  borrowingSettled,
  dayShort,
  formatCurrency,
  sumBy,
} from "@/utils";
import type { Borrowing, BorrowingPayment } from "@/types";
import styles from "./BorrowingsList.module.scss";

interface ChildTarget {
  borrowingId: string;
  payment: BorrowingPayment | null;
  outstanding: number;
}

export const BorrowingsList = () => {
  const borrowings = useFinanceStore((s) => s.borrowings);
  const currency = useFinanceStore((s) => s.profile?.currency ?? "INR");

  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<Borrowing | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [childTarget, setChildTarget] = useState<ChildTarget | null>(null);

  const totalOutstanding = sumBy(borrowings, borrowingOutstanding);

  const openAdd = () => {
    setEditing(null);
    setSheetOpen(true);
  };
  const openEdit = (b: Borrowing) => {
    setEditing(b);
    setSheetOpen(true);
  };

  return (
    <section>
      <div className={styles.header}>
        <div className={styles.header_text}>
          <h3 className={styles.header_title}>Money borrowed</h3>
          <p className={styles.header_caption}>
            {borrowings.length} record{borrowings.length === 1 ? "" : "s"}
          </p>
        </div>
        <span className={styles.header_out}>
          {formatCurrency(totalOutstanding, currency)}
        </span>
      </div>

      {borrowings.length === 0 ? (
        <button type="button" className={styles.empty} onClick={openAdd}>
          <span className={styles.empty_icon}>
            <HandCoins size={20} />
          </span>
          <span className={styles.empty_text}>
            <span className={styles.empty_title}>No borrowings yet</span>
            <span className={styles.empty_desc}>
              Track money you borrowed from someone
            </span>
          </span>
          <span className={styles.empty_add}>
            <Plus size={18} />
          </span>
        </button>
      ) : (
        <div className={styles.list}>
          {borrowings.map((b) => {
            const repaid = borrowingRepaid(b);
            const outstanding = borrowingOutstanding(b);
            const settled = borrowingSettled(b);
            const pct =
              b.amount > 0 ? Math.min(100, (repaid / b.amount) * 100) : 0;
            const payments = [...(b.payments ?? [])].sort((a, c) =>
              c.paidOn.localeCompare(a.paidOn),
            );
            const isOpen = expanded === b.id;
            return (
              <Card key={b.id} surface="solid" className={styles.item}>
                <div className={styles.item_head}>
                  <button
                    type="button"
                    className={styles.item_main}
                    onClick={() => openEdit(b)}
                    aria-label={`Edit borrowing from ${b.lender}`}
                  >
                    <span className={styles.item_icon}>
                      <HandCoins size={18} />
                    </span>
                    <span className={styles.item_info}>
                      <span className={styles.item_name}>{b.lender}</span>
                      <span className={styles.item_sub}>
                        {b.purpose ? `${b.purpose} · ` : ""}
                        {dayShort(b.borrowedOn)}
                      </span>
                    </span>
                  </button>
                  <span className={styles.item_amount}>
                    {formatCurrency(settled ? b.amount : outstanding, currency)}
                    {!settled && <span className={styles.item_per}> left</span>}
                  </span>
                  <button
                    type="button"
                    className={styles.item_arrow}
                    onClick={() => setExpanded(isOpen ? null : b.id)}
                    aria-label={isOpen ? "Hide payments" : "Show payments"}
                    aria-expanded={isOpen}
                  >
                    <m.span
                      animate={{ rotate: isOpen ? 90 : 0 }}
                      transition={{ duration: 0.2 }}
                      style={{ display: "grid" }}
                    >
                      <ChevronRight size={18} />
                    </m.span>
                  </button>
                </div>

                <ProgressBar
                  value={pct}
                  tone={settled ? "lime" : "ocean"}
                  size="sm"
                />
                <div className={styles.item_foot}>
                  {settled ? (
                    <Badge tone="lime">
                      <CheckCircle2 size={12} /> Settled
                    </Badge>
                  ) : (
                    <Badge tone="ocean">
                      {formatCurrency(repaid, currency)} repaid
                    </Badge>
                  )}
                  <span className={styles.item_remaining}>
                    of {formatCurrency(b.amount, currency)}
                    {b.dueDate && !settled
                      ? ` · due ${dayShort(b.dueDate)}`
                      : ""}
                  </span>
                </div>

                <AnimatePresence initial={false}>
                  {isOpen && (
                    <m.div
                      className={styles.children}
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                    >
                      {payments.length > 0 ? (
                        payments.map((p) => (
                          <button
                            key={p.id}
                            type="button"
                            className={styles.child}
                            onClick={() =>
                              setChildTarget({
                                borrowingId: b.id,
                                payment: p,
                                outstanding,
                              })
                            }
                          >
                            <span className={styles.child_month}>
                              {dayShort(p.paidOn)}
                              {p.note ? ` · ${p.note}` : ""}
                            </span>
                            <span className={styles.child_amount}>
                              {formatCurrency(p.amount, currency)}
                            </span>
                          </button>
                        ))
                      ) : (
                        <span className={styles.child_empty}>
                          No repayments logged yet
                        </span>
                      )}
                      {!settled && (
                        <button
                          type="button"
                          className={styles.childAdd}
                          aria-label="Record a repayment"
                          onClick={() =>
                            setChildTarget({
                              borrowingId: b.id,
                              payment: null,
                              outstanding,
                            })
                          }
                        >
                          <Plus size={15} />
                          Add
                        </button>
                      )}
                    </m.div>
                  )}
                </AnimatePresence>
              </Card>
            );
          })}
          <button type="button" className={styles.add} onClick={openAdd}>
            <Plus size={18} />
            Add New Record
          </button>
        </div>
      )}

      <AddBorrowingSheet
        key={editing?.id ?? "new"}
        open={sheetOpen}
        borrowing={editing}
        onClose={() => setSheetOpen(false)}
      />

      <AddBorrowingPaymentSheet
        key={
          childTarget?.payment?.id ??
          `${childTarget?.borrowingId ?? "none"}-new`
        }
        open={childTarget !== null}
        borrowingId={childTarget?.borrowingId ?? null}
        payment={childTarget?.payment ?? null}
        outstanding={childTarget?.outstanding ?? 0}
        currency={currency}
        onClose={() => setChildTarget(null)}
      />
    </section>
  );
};
