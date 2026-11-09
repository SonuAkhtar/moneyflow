"use client";

import { useMemo, useState, type CSSProperties } from "react";
import { m } from "framer-motion";
import {
  ArrowDownRight,
  ArrowLeftRight,
  ArrowRight,
  ArrowUpRight,
  Landmark,
  Plus,
} from "lucide-react";
import { Card } from "@/components/Card/Card";
import { SectionHeader } from "@/components/SectionHeader/SectionHeader";
import { AddSavingsSheet } from "@/sections/AddSavingsSheet/AddSavingsSheet";
import { TransferSheet } from "@/sections/TransferSheet/TransferSheet";
import { useFinanceStore } from "@/store/financeStore";
import {
  BANK_TRANSFER_IN_NOTE,
  BANK_TRANSFER_OUT_NOTE,
  bankMonthFlow,
  cn,
  currentMonthKey,
  dayShort,
  findTransferPair,
  isBankTransfer,
  monthKey,
  monthLabel,
  sumBy,
  formatCurrency,
} from "@/utils";
import { listItem, staggerContainer } from "@/themes/animations";
import type { Account, Transaction } from "@/types";
import styles from "./AccountsList.module.scss";

const relativeDay = (iso: string): string => {
  const d = new Date(iso);
  const today = new Date();
  const start = (x: Date) =>
    new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diff = Math.round((start(today) - start(d)) / 86_400_000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  return dayShort(iso);
};

export const AccountsList = () => {
  const accounts = useFinanceStore((s) => s.accounts);
  const transactions = useFinanceStore((s) => s.transactions);
  const currency = useFinanceStore((s) => s.profile?.currency ?? "INR");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<Account | null>(null);
  const [openCount, setOpenCount] = useState(0);
  const [transferOpen, setTransferOpen] = useState(false);
  const [editingTransfer, setEditingTransfer] = useState<Transaction | null>(
    null,
  );
  const [showAllTransfers, setShowAllTransfers] = useState(false);

  const banks = useMemo(
    () => accounts.filter((a) => a.type === "savings"),
    [accounts],
  );
  const total = sumBy(banks, (a) => a.balance);

  const transfers = useMemo(() => {
    const rows: {
      leg: Transaction;
      fromName: string;
      toName: string;
      fromColor: string;
      toColor: string;
    }[] = [];
    for (const t of transactions) {
      if (!isBankTransfer(t)) continue;
      const pair = findTransferPair(t, transactions);
      if (t.note === BANK_TRANSFER_IN_NOTE && pair) continue;
      const out = t.note === BANK_TRANSFER_OUT_NOTE ? t : undefined;
      const inn = out ? pair : t;
      const fromAcct = out && accounts.find((a) => a.id === out.accountId);
      const toAcct = inn && accounts.find((a) => a.id === inn.accountId);
      rows.push({
        leg: t,
        fromColor: fromAcct ? fromAcct.colorTag : "var(--text-tertiary)",
        toColor: toAcct ? toAcct.colorTag : "var(--text-tertiary)",
        fromName:
          (out && accounts.find((a) => a.id === out.accountId)?.name) ??
          inn?.merchant?.replace(/^From /, "") ??
          "Deleted bank",
        toName:
          (inn && accounts.find((a) => a.id === inn.accountId)?.name) ??
          out?.merchant?.replace(/^To /, "") ??
          "Deleted bank",
      });
    }
    return rows.sort(
      (a, b) => +new Date(b.leg.occurredAt) - +new Date(a.leg.occurredAt),
    );
  }, [transactions, accounts]);
  const visibleTransfers = showAllTransfers ? transfers : transfers.slice(0, 5);
  const month = currentMonthKey();
  const movedThisMonth = sumBy(
    transfers.filter((t) => monthKey(t.leg.occurredAt) === month),
    (t) => t.leg.amount,
  );
  const transferGroups = useMemo(() => {
    const totals = new Map<string, number>();
    for (const row of transfers) {
      const key = monthKey(row.leg.occurredAt);
      totals.set(key, (totals.get(key) ?? 0) + row.leg.amount);
    }
    const groups: { month: string; total: number; rows: typeof transfers }[] =
      [];
    for (const row of visibleTransfers) {
      const key = monthKey(row.leg.occurredAt);
      const last = groups[groups.length - 1];
      if (last && last.month === key) last.rows.push(row);
      else
        groups.push({ month: key, total: totals.get(key) ?? 0, rows: [row] });
    }
    return groups;
  }, [transfers, visibleTransfers]);

  const openSheet = (bank: Account | null) => {
    setEditing(bank);
    setSheetOpen(true);
    setOpenCount((n) => n + 1);
  };

  return (
    <section>
      <div className={styles.head}>
        <div className={styles.head_text}>
          <h3 className={styles.head_title}>Banks</h3>
          <p className={styles.head_caption}>
            {banks.length} account{banks.length === 1 ? "" : "s"} ·{" "}
            <span
              className={cn(
                styles.head_total,
                total < 0 && styles["head_total--neg"],
              )}
            >
              {formatCurrency(total, currency)}
            </span>
          </p>
        </div>
        <button
          type="button"
          className={styles.transferBtn}
          onClick={() => setTransferOpen(true)}
          disabled={accounts.length < 2}
          aria-label="Transfer money"
          title={accounts.length < 2 ? "Add 2 accounts to transfer" : undefined}
        >
          <ArrowLeftRight size={15} aria-hidden />
          Transfer
        </button>
      </div>

      <m.div
        className={styles.grid}
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
      >
        {banks.map((bank) => {
          const flow = bankMonthFlow(bank.id, transactions, month);
          const share =
            total > 0 ? Math.round((bank.balance / total) * 100) : 0;
          const fillWidth = Math.max(0, Math.min(100, share));
          return (
            <m.div key={bank.id} variants={listItem}>
              <Card
                surface="solid"
                interactive
                className={styles.card}
                style={{ "--bank": bank.colorTag } as CSSProperties}
                role="button"
                tabIndex={0}
                aria-label={`Edit ${bank.name}`}
                onClick={() => openSheet(bank)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    openSheet(bank);
                  }
                }}
              >
                <div className={styles.card_head}>
                  <span
                    className={styles.card_icon}
                    style={{
                      background: `${bank.colorTag}1f`,
                      color: bank.colorTag,
                    }}
                  >
                    <Landmark size={15} />
                  </span>
                  <span className={styles.card_name}>{bank.name}</span>
                </div>
                <span
                  className={cn(
                    styles.card_balance,
                    bank.balance < 0 && styles["card_balance--neg"],
                  )}
                >
                  {formatCurrency(bank.balance, currency)}
                </span>
                <span className={styles.card_track}>
                  <span
                    className={styles.card_fill}
                    style={{ width: `${fillWidth}%` }}
                  />
                </span>
                <div className={styles.card_foot}>
                  <span className={styles.card_share}>{share}% of savings</span>
                  {flow.net !== 0 && (
                    <span
                      className={cn(
                        styles.card_delta,
                        flow.net > 0
                          ? styles["card_delta--in"]
                          : styles["card_delta--out"],
                      )}
                    >
                      {flow.net > 0 ? (
                        <ArrowUpRight size={11} />
                      ) : (
                        <ArrowDownRight size={11} />
                      )}
                      {formatCurrency(Math.abs(flow.net), currency)}
                    </span>
                  )}
                </div>
              </Card>
            </m.div>
          );
        })}

        <m.button
          variants={listItem}
          type="button"
          className={styles.add}
          onClick={() => openSheet(null)}
        >
          <Plus size={18} />
          <span>Add bank</span>
        </m.button>
      </m.div>

      {transfers.length > 0 && (
        <div className={styles.transfers}>
          <SectionHeader
            title="Recent transfers"
            caption={
              movedThisMonth > 0
                ? `${formatCurrency(movedThisMonth, currency)} moved this month`
                : `${transfers.length} between your accounts`
            }
          />
          <Card
            surface="solid"
            padded={false}
            className={styles.transfers_list}
          >
            {transferGroups.map((group) => (
              <div key={group.month} className={styles.tgroup}>
                <div className={styles.tgroup_head}>
                  <span>{monthLabel(group.month)}</span>
                  <span>{formatCurrency(group.total, currency)}</span>
                </div>
                {group.rows.map(
                  ({ leg, fromName, toName, fromColor, toColor }) => (
                    <button
                      key={leg.id}
                      type="button"
                      className={styles.transfer}
                      onClick={() => setEditingTransfer(leg)}
                      aria-label={`Edit transfer from ${fromName} to ${toName}`}
                    >
                      <span className={styles.transfer_banks} aria-hidden>
                        <span
                          className={styles.transfer_bank}
                          style={{ "--bank": fromColor } as CSSProperties}
                        >
                          {fromName.charAt(0).toUpperCase()}
                        </span>
                        <span
                          className={styles.transfer_bank}
                          style={{ "--bank": toColor } as CSSProperties}
                        >
                          {toName.charAt(0).toUpperCase()}
                        </span>
                      </span>
                      <span className={styles.transfer_text}>
                        <span className={styles.transfer_route}>
                          <span className={styles.transfer_name}>
                            {fromName}
                          </span>
                          <ArrowRight
                            size={13}
                            className={styles.transfer_arrow}
                            aria-hidden
                          />
                          <span className={styles.transfer_name}>{toName}</span>
                        </span>
                        <span className={styles.transfer_date}>
                          {relativeDay(leg.occurredAt)}
                        </span>
                      </span>
                      <span className={styles.transfer_amount}>
                        {formatCurrency(leg.amount, currency)}
                      </span>
                    </button>
                  ),
                )}
              </div>
            ))}
            {transfers.length > 5 && (
              <button
                type="button"
                className={styles.transfers_more}
                onClick={() => setShowAllTransfers((v) => !v)}
              >
                {showAllTransfers
                  ? "Show less"
                  : `Show all ${transfers.length}`}
              </button>
            )}
          </Card>
        </div>
      )}

      <TransferSheet
        open={transferOpen || editingTransfer !== null}
        transfer={editingTransfer}
        onClose={() => {
          setTransferOpen(false);
          setEditingTransfer(null);
        }}
      />

      <AddSavingsSheet
        key={openCount}
        open={sheetOpen}
        account={editing}
        onClose={() => setSheetOpen(false)}
      />
    </section>
  );
};
