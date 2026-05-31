"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronRight, CreditCard, Pencil, Plus, TrendingUp } from "lucide-react";
import { Card } from "@/components/Card/Card";
import { ProgressBar } from "@/components/ProgressBar/ProgressBar";
import { Badge } from "@/components/Badge/Badge";
import { AddEmiSheet } from "@/sections/AddEmiSheet/AddEmiSheet";
import { AddEmiPaymentSheet } from "@/sections/AddEmiPaymentSheet/AddEmiPaymentSheet";
import { useFinanceStore } from "@/store/financeStore";
import {
  emiKind,
  emiPaidAmount,
  emiPaidMonths,
  emiStartMonth,
  formatCurrency,
  monthLabel,
  sumBy,
} from "@/utils";
import type { Emi, EmiKind, EmiPayment } from "@/types";
import styles from "./EmiList.module.scss";

const SECTION = {
  loan: {
    title: "Loan EMIs",
    icon: CreditCard,
    addLabel: "Add New Loan EMI Plan",
    addChild: "Add payment to this Loan",
    emptyTitle: "No loan EMIs yet",
    emptyDesc: "Tap to add your first loan EMI",
  },
  sip: {
    title: "SIPs",
    icon: TrendingUp,
    addLabel: "Add New SIP Plan",
    addChild: "Add payment to this SIP",
    emptyTitle: "No SIPs yet",
    emptyDesc: "Tap to add your first SIP",
  },
} satisfies Record<EmiKind, unknown>;

interface EmiListProps {
  kind: EmiKind;
}

interface ChildTarget {
  emiId: string;
  payment: EmiPayment | null;
}

export const EmiList = ({ kind }: EmiListProps) => {
  const emis = useFinanceStore((s) => s.emis);
  const currency = useFinanceStore((s) => s.profile?.currency ?? "INR");

  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<Emi | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [childTarget, setChildTarget] = useState<ChildTarget | null>(null);

  const meta = SECTION[kind];
  const Icon = meta.icon;
  const active = emis.filter(
    (e) => e.status === "active" && emiKind(e) === kind,
  );
  const totalPaid = sumBy(active, emiPaidAmount);

  const openAdd = () => {
    setEditing(null);
    setSheetOpen(true);
  };

  const openEdit = (emi: Emi) => {
    setEditing(emi);
    setSheetOpen(true);
  };

  return (
    <section>
      <div className={styles.header}>
        <div className={styles.header_text}>
          <h3 className={styles.header_title}>{meta.title}</h3>
          <p className={styles.header_caption}>{active.length} active</p>
        </div>
        <span
          className={`${styles.header_paid} ${
            kind === "sip" ? styles["header_paid--sip"] : ""
          }`}
        >
          {formatCurrency(totalPaid, currency)}
        </span>
      </div>

      {active.length === 0 ? (
        <button type="button" className={styles.empty} onClick={openAdd}>
          <span className={styles.empty_icon}>
            <Icon size={20} />
          </span>
          <span className={styles.empty_text}>
            <span className={styles.empty_title}>{meta.emptyTitle}</span>
            <span className={styles.empty_desc}>{meta.emptyDesc}</span>
          </span>
          <span className={styles.empty_add}>
            <Plus size={18} />
          </span>
        </button>
      ) : (
        <div className={styles.list}>
          {active.map((emi) => {
            const paidMonths = emiPaidMonths(emi);
            const hasSchedule = emi.totalMonths > 0;
            const pct = hasSchedule
              ? Math.min(100, (paidMonths / emi.totalMonths) * 100)
              : 0;
            const remainingMonths = Math.max(0, emi.totalMonths - paidMonths);
            const paidAmount = emiPaidAmount(emi);
            const payments = [...(emi.payments ?? [])].sort((a, b) =>
              b.month.localeCompare(a.month),
            );
            const isOpen = expanded === emi.id;
            return (
              <Card key={emi.id} surface="solid" className={styles.item}>
                <div className={styles.item_head}>
                  <button
                    type="button"
                    className={styles.item_main}
                    onClick={() => openEdit(emi)}
                    aria-label={`Edit ${emi.name}`}
                  >
                    <span className={styles.item_icon}>
                      <Icon size={18} />
                    </span>
                    <span className={styles.item_info}>
                      <span className={styles.item_name}>{emi.name}</span>
                      <span className={styles.item_sub}>
                        Started · {monthLabel(emiStartMonth(emi))}
                      </span>
                    </span>
                  </button>
                  <span
                    className={`${styles.item_amount} ${
                      kind === "sip" ? styles["item_amount--sip"] : ""
                    }`}
                  >
                    {formatCurrency(emi.monthlyAmount, currency)}
                    <span className={styles.item_per}>/mo</span>
                  </span>
                  <button
                    type="button"
                    className={styles.item_arrow}
                    onClick={() => setExpanded(isOpen ? null : emi.id)}
                    aria-label={isOpen ? "Hide payments" : "Show payments"}
                    aria-expanded={isOpen}
                  >
                    <motion.span
                      animate={{ rotate: isOpen ? 90 : 0 }}
                      transition={{ duration: 0.2 }}
                      style={{ display: "grid" }}
                    >
                      <ChevronRight size={18} />
                    </motion.span>
                  </button>
                </div>

                {kind === "loan" && hasSchedule && (
                  <>
                    <ProgressBar value={pct} tone="ocean" size="sm" />
                    <div className={styles.item_foot}>
                      <Badge tone="ocean">
                        {paidMonths}/{emi.totalMonths} paid
                      </Badge>
                      <span className={styles.item_remaining}>
                        {formatCurrency(paidAmount, currency)} paid ·{" "}
                        {remainingMonths} mo left
                      </span>
                    </div>
                  </>
                )}
                {kind === "sip" && paidMonths > 0 && (
                  <div className={styles.item_foot}>
                    <Badge tone="ocean">{paidMonths} months</Badge>
                    <span className={styles.item_remaining}>
                      {formatCurrency(paidAmount, currency)} invested
                    </span>
                  </div>
                )}

                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
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
                              setChildTarget({ emiId: emi.id, payment: p })
                            }
                          >
                            <span className={styles.child_month}>
                              {monthLabel(p.month)}
                            </span>
                            <span className={styles.child_right}>
                              <span className={styles.child_amount}>
                                {formatCurrency(p.amount, currency)}
                              </span>
                              <Pencil
                                size={14}
                                className={styles.child_edit}
                                aria-hidden
                              />
                            </span>
                          </button>
                        ))
                      ) : (
                        <span className={styles.child_empty}>
                          No payments logged yet
                        </span>
                      )}
                      <button
                        type="button"
                        className={styles.childAdd}
                        aria-label={meta.addChild}
                        onClick={() =>
                          setChildTarget({ emiId: emi.id, payment: null })
                        }
                      >
                        <Plus size={15} />
                        Add
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </Card>
            );
          })}
          <button type="button" className={styles.add} onClick={openAdd}>
            <Plus size={18} />
            {meta.addLabel}
          </button>
        </div>
      )}

      <AddEmiSheet
        key={editing?.id ?? "new"}
        open={sheetOpen}
        kind={kind}
        emi={editing}
        onClose={() => setSheetOpen(false)}
      />

      <AddEmiPaymentSheet
        key={childTarget?.payment?.id ?? `${childTarget?.emiId ?? "none"}-new`}
        open={childTarget !== null}
        kind={kind}
        emiId={childTarget?.emiId ?? null}
        payment={childTarget?.payment ?? null}
        onClose={() => setChildTarget(null)}
      />
    </section>
  );
};
