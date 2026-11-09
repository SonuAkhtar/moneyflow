"use client";

import { useState } from "react";
import { AnimatePresence, m } from "framer-motion";
import { format, parseISO } from "date-fns";
import {
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  CreditCard,
  Pencil,
  Plus,
  TrendingUp,
} from "lucide-react";
import { Card } from "@/components/Card/Card";
import { ProgressBar } from "@/components/ProgressBar/ProgressBar";
import { Badge } from "@/components/Badge/Badge";
import { AddEmiSheet } from "@/sections/AddEmiSheet/AddEmiSheet";
import { AddEmiPaymentSheet } from "@/sections/AddEmiPaymentSheet/AddEmiPaymentSheet";
import { useFinanceStore } from "@/store/financeStore";
import {
  currentMonthKey,
  dayShort,
  emiAmountFor,
  emiEndMonth,
  emiInstalments,
  emiKind,
  emiPaidAmount,
  emiPaidMonths,
  emiStartMonth,
  formatCurrency,
  lastNMonthKeys,
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
  month?: string;
}

export const EmiList = ({ kind }: EmiListProps) => {
  const emis = useFinanceStore((s) => s.emis);
  const currency = useFinanceStore((s) => s.profile?.currency ?? "INR");

  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<Emi | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [childTarget, setChildTarget] = useState<ChildTarget | null>(null);
  const [childOpen, setChildOpen] = useState(false);
  const [openCount, setOpenCount] = useState(0);
  const [showClosed, setShowClosed] = useState(false);

  const meta = SECTION[kind];
  const Icon = meta.icon;
  const active = emis.filter(
    (e) => e.status === "active" && emiKind(e) === kind,
  );
  const closed = emis.filter(
    (e) => e.status === "closed" && emiKind(e) === kind,
  );
  const totalPaid = sumBy(active, emiPaidAmount);

  const sipMonths = kind === "sip" ? [...lastNMonthKeys(6)].reverse() : [];
  const thisMonth = currentMonthKey();

  const openAdd = () => {
    setEditing(null);
    setSheetOpen(true);
    setOpenCount((n) => n + 1);
  };

  const openEdit = (emi: Emi) => {
    setEditing(emi);
    setSheetOpen(true);
    setOpenCount((n) => n + 1);
  };

  const openChild = (target: ChildTarget) => {
    setChildTarget(target);
    setChildOpen(true);
    setOpenCount((n) => n + 1);
  };

  const renderCard = (emi: Emi, isClosed: boolean) => {
    const paidMonths = emiPaidMonths(emi);
    const hasSchedule = emi.totalMonths > 0;
    const pct = hasSchedule
      ? Math.min(100, (paidMonths / emi.totalMonths) * 100)
      : 0;
    const remainingMonths = Math.max(0, emi.totalMonths - paidMonths);
    const paidAmount = emiPaidAmount(emi);
    const payments = [...(emi.payments ?? [])].sort(
      (a, b) =>
        b.month.localeCompare(a.month) || b.paidOn.localeCompare(a.paidOn),
    );
    const isOpen = expanded === emi.id;
    const shortMonth = (month: string) =>
      format(parseISO(`${month}-01`), "MMM yyyy");
    const nextChange = (emi.amountChanges ?? [])
      .filter((c) => c.from > thisMonth)
      .sort((a, b) => a.from.localeCompare(b.from))[0];
    const loanSub = [
      emi.principal > 0 &&
        formatCurrency(emi.principal, currency, { compact: true }),
      emi.interestRate > 0 && `${emi.interestRate}% p.a.`,
      nextChange &&
        `${formatCurrency(nextChange.amount, currency)} from ${shortMonth(nextChange.from)}`,
    ]
      .filter(Boolean)
      .join(" · ");
    return (
      <Card
        key={emi.id}
        surface="solid"
        className={`${styles.item} ${styles[`item--${kind}`]}`}
      >
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
              <span className={styles.item_name}>
                {emi.name}
                {isClosed && <Badge tone="lime">Closed</Badge>}
              </span>
              <span className={styles.item_sub}>
                {kind === "sip"
                  ? `${formatCurrency(emi.monthlyAmount, currency)}/mo · since ${format(
                      parseISO(`${emiStartMonth(emi)}-01`),
                      "MMM yyyy",
                    )}`
                  : loanSub || `Started ${shortMonth(emiStartMonth(emi))}`}
              </span>
            </span>
          </button>
          {kind === "loan" && (
            <span className={styles.item_amount}>
              {formatCurrency(emiAmountFor(emi, thisMonth), currency)}
              <span className={styles.item_per}>/mo</span>
            </span>
          )}
          <button
            type="button"
            className={styles.item_arrow}
            onClick={() => setExpanded(isOpen ? null : emi.id)}
            aria-label={`${isOpen ? "Hide" : "Show"} payments for ${emi.name}`}
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

        {kind === "loan" && (
          <div className={styles.loan}>
            <div className={styles.loan_stats}>
              <span className={styles.loan_stat}>
                <span className={styles.loan_label}>Paid</span>
                <span className={styles.loan_value}>
                  {formatCurrency(paidAmount, currency, {
                    compact: paidAmount >= 1000000,
                  })}
                </span>
              </span>
              <span className={styles.loan_stat}>
                <span className={styles.loan_label}>EMIs</span>
                <span className={styles.loan_value}>
                  {hasSchedule
                    ? `${paidMonths}/${emi.totalMonths}`
                    : paidMonths}
                </span>
              </span>
              {hasSchedule && (
                <span className={styles.loan_stat}>
                  <span className={styles.loan_label}>Left</span>
                  <span className={styles.loan_value}>
                    {remainingMonths} mo
                  </span>
                </span>
              )}
            </div>
            {hasSchedule && (
              <>
                <ProgressBar
                  value={pct}
                  tone="ocean"
                  size="sm"
                  label={`${emi.name}: ${paidMonths} of ${emi.totalMonths} EMIs paid`}
                />
                <div className={styles.loan_dates}>
                  <span>Started {shortMonth(emiStartMonth(emi))}</span>
                  <span>Ends {shortMonth(emiEndMonth(emi))}</span>
                </div>
              </>
            )}
          </div>
        )}
        {kind === "sip" && (
          <div className={styles.sip}>
            <div className={styles.sip_stats}>
              <span className={styles.sip_stat}>
                <span className={styles.sip_label}>Invested</span>
                <span className={styles.sip_value}>
                  {formatCurrency(paidAmount, currency)}
                </span>
              </span>
              <span className={`${styles.sip_stat} ${styles["sip_stat--end"]}`}>
                <span className={styles.sip_label}>
                  {hasSchedule ? "Progress" : "Paid"}
                </span>
                <span className={styles.sip_value}>
                  {hasSchedule
                    ? `${paidMonths}/${emi.totalMonths} mo`
                    : `${paidMonths} mo`}
                </span>
              </span>
            </div>
            {hasSchedule && (
              <ProgressBar
                value={pct}
                size="sm"
                tone="lime"
                className={styles.sip_bar}
                label={`${emi.name}: ${paidMonths} of ${emi.totalMonths} months paid`}
              />
            )}
          </div>
        )}

        <AnimatePresence initial={false}>
          {isOpen && (
            <m.div
              className={styles.children}
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            >
              {kind === "sip" ? (
                [
                  ...new Set([
                    ...sipMonths,
                    ...emiInstalments(emi).map((p) => p.month),
                  ]),
                ]
                  .filter((month) => month >= emiStartMonth(emi))
                  .sort((a, b) => b.localeCompare(a))
                  .map((month) => {
                    const p = payments.find(
                      (pp) => pp.month === month && pp.kind !== "extra",
                    );
                    return (
                      <button
                        key={month}
                        type="button"
                        className={styles.child}
                        onClick={() =>
                          openChild({
                            emiId: emi.id,
                            payment: p ?? null,
                            month,
                          })
                        }
                      >
                        <span className={styles.child_month}>
                          {monthLabel(month)}
                          {month === thisMonth && (
                            <span className={styles.child_tag}>Current</span>
                          )}
                        </span>
                        <span className={styles.child_right}>
                          {p ? (
                            <>
                              <span className={styles.child_amount}>
                                {formatCurrency(p.amount, currency)}
                              </span>
                              <Pencil
                                size={14}
                                className={styles.child_edit}
                                aria-hidden
                              />
                            </>
                          ) : (
                            <span className={styles.child_add}>
                              <Plus size={14} />
                              Add
                            </span>
                          )}
                        </span>
                      </button>
                    );
                  })
              ) : (
                <>
                  {payments.length > 0 ? (
                    <div className={styles.payments}>
                      {payments.map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          className={styles.child}
                          onClick={() =>
                            openChild({ emiId: emi.id, payment: p })
                          }
                        >
                          <span className={styles.child_month}>
                            {p.kind === "extra"
                              ? dayShort(p.paidOn)
                              : monthLabel(p.month)}
                            {p.kind === "extra" && (
                              <span className={styles.child_tag}>Lump sum</span>
                            )}
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
                      ))}
                    </div>
                  ) : (
                    <span className={styles.child_empty}>
                      No payments logged yet
                    </span>
                  )}
                  {!isClosed && (
                    <button
                      type="button"
                      className={styles.childAdd}
                      aria-label={meta.addChild}
                      onClick={() =>
                        openChild({ emiId: emi.id, payment: null })
                      }
                    >
                      <Plus size={15} />
                      Add
                    </button>
                  )}
                </>
              )}
            </m.div>
          )}
        </AnimatePresence>
      </Card>
    );
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

      {active.length === 0 && closed.length === 0 ? (
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
          {active.map((emi) => renderCard(emi, false))}
          {closed.length > 0 && (
            <button
              type="button"
              className={styles.toggle}
              onClick={() => setShowClosed((v) => !v)}
              aria-expanded={showClosed}
              aria-label={`${showClosed ? "Hide" : "Show"} closed (${closed.length})`}
            >
              <span className={styles.toggle_icon}>
                <CheckCircle2 size={16} aria-hidden />
              </span>
              <span className={styles.toggle_label}>Closed</span>
              <span className={styles.toggle_count}>{closed.length}</span>
              <m.span
                className={styles.toggle_chevron}
                animate={{ rotate: showClosed ? 180 : 0 }}
                transition={{ duration: 0.25 }}
              >
                <ChevronDown size={18} aria-hidden />
              </m.span>
            </button>
          )}
          <AnimatePresence initial={false}>
            {showClosed && (
              <m.div
                className={styles.collapse}
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              >
                {closed.map((emi) => renderCard(emi, true))}
              </m.div>
            )}
          </AnimatePresence>
          <button
            type="button"
            className={styles.fab}
            onClick={openAdd}
            aria-label={meta.addLabel}
          >
            <Plus size={22} strokeWidth={2.4} />
          </button>
        </div>
      )}

      <AddEmiSheet
        key={`sheet-${openCount}`}
        open={sheetOpen}
        kind={kind}
        emi={editing}
        onClose={() => setSheetOpen(false)}
      />

      <AddEmiPaymentSheet
        key={`child-${openCount}`}
        open={childOpen}
        kind={kind}
        emiId={childTarget?.emiId ?? null}
        payment={childTarget?.payment ?? null}
        defaultMonth={childTarget?.month ?? null}
        onClose={() => setChildOpen(false)}
      />
    </section>
  );
};
