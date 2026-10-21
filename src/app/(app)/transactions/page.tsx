"use client";

import { Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AnimatePresence, m } from "framer-motion";
import { ListFilter, Search, SearchX, X } from "lucide-react";
import { Card } from "@/components/Card/Card";
import { Button } from "@/components/Button/Button";
import { Input } from "@/components/Input/Input";
import { Select } from "@/components/Select/Select";
import { SegmentedControl } from "@/components/SegmentedControl/SegmentedControl";
import { EmptyState } from "@/components/EmptyState/EmptyState";
import { TransactionItem } from "@/components/TransactionItem/TransactionItem";
import { EditTransactionSheet } from "@/sections/EditTransactionSheet/EditTransactionSheet";
import { TransferSheet } from "@/sections/TransferSheet/TransferSheet";
import { useFinanceStore } from "@/store/financeStore";
import {
  cn,
  formatCurrency,
  isBankTransfer,
  monthKey,
  monthLabel,
  transactionDelta,
} from "@/utils";
import {
  EMPTY_FILTERS,
  activeFilterCount,
  filterTransactions,
  groupByMonth,
  type TransactionFilters,
  type TxnKindFilter,
  type TxnTypeFilter,
} from "@/utils/transactionFilters";
import {
  CATEGORY_META,
  EXPENSE_CATEGORIES,
  INCOME_CATEGORIES,
} from "@/constants";
import type { Transaction } from "@/types";
import styles from "./page.module.scss";

const PAGE_SIZE = 50;

const KIND_OPTIONS: { label: string; value: TxnKindFilter }[] = [
  { label: "All expenses", value: "all" },
  { label: "Major only", value: "major" },
  { label: "Daily only", value: "daily" },
];

const sanitizeAmount = (raw: string) => raw.replace(/[^0-9.]/g, "");

function TransactionsView() {
  const params = useSearchParams();
  const initialKind = params.get("kind");
  const transactions = useFinanceStore((s) => s.transactions);
  const accounts = useFinanceStore((s) => s.accounts);
  const currency = useFinanceStore((s) => s.profile?.currency ?? "INR");
  const historyFrom = useFinanceStore((s) => s.historyFrom);
  const historyLoading = useFinanceStore((s) => s.historyLoading);
  const loadHistory = useFinanceStore((s) => s.loadHistory);

  const [filters, setFilters] = useState<TransactionFilters>(() => ({
    ...EMPTY_FILTERS,
    kind:
      initialKind === "major" || initialKind === "daily" ? initialKind : "all",
  }));
  const [panelOpen, setPanelOpen] = useState(false);
  const [limit, setLimit] = useState(PAGE_SIZE);
  const [editing, setEditing] = useState<Transaction | null>(null);

  const set = <K extends keyof TransactionFilters>(
    key: K,
    value: TransactionFilters[K],
  ) => {
    setFilters((f) => ({ ...f, [key]: value }));
    setLimit(PAGE_SIZE);
  };

  const results = useMemo(
    () => filterTransactions(transactions, filters),
    [transactions, filters],
  );
  const visible = useMemo(() => results.slice(0, limit), [results, limit]);
  const groups = useMemo(() => groupByMonth(visible), [visible]);
  const activeCount = activeFilterCount(filters);
  const hasAnyFilter =
    activeCount > 0 || filters.query.trim() !== "" || filters.type !== "all";

  const categoryOptions = useMemo(() => {
    const ids = [...new Set([...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES])];
    return [
      { label: "All categories", value: "all" },
      ...ids.map((id) => ({ label: CATEGORY_META[id].label, value: id })),
    ];
  }, []);
  const accountOptions = [
    { label: "All accounts", value: "all" },
    ...accounts.map((a) => ({ label: a.name, value: a.id })),
  ];

  const searchOlder = () => {
    if (!historyFrom) return;
    const d = new Date(historyFrom);
    void loadHistory(monthKey(new Date(d.getFullYear() - 1, d.getMonth(), 1)));
  };

  return (
    <div className={styles.page}>
      <div className={styles.top}>
        <Input
          type="search"
          icon={Search}
          aria-label="Search transactions"
          placeholder="Search merchant, note, category or amount"
          value={filters.query}
          onChange={(e) => set("query", e.target.value)}
          className={styles.search}
        />
        <button
          type="button"
          className={cn(
            styles.filterBtn,
            (panelOpen || activeCount > 0) && styles["filterBtn--on"],
          )}
          aria-expanded={panelOpen}
          aria-controls="transaction-filters"
          aria-label={
            activeCount > 0 ? `Filters, ${activeCount} active` : "Filters"
          }
          onClick={() => setPanelOpen((v) => !v)}
        >
          <ListFilter size={18} />
          {activeCount > 0 && (
            <span className={styles.filterBtn_count} aria-hidden>
              {activeCount}
            </span>
          )}
        </button>
      </div>

      <SegmentedControl<TxnTypeFilter>
        className={styles.segments}
        aria-label="Transaction type"
        size="sm"
        segments={[
          { label: "All", value: "all" },
          { label: "Income", value: "income" },
          { label: "Expense", value: "expense" },
          { label: "Transfer", value: "transfer" },
        ]}
        value={filters.type}
        onChange={(v) => set("type", v)}
      />

      <AnimatePresence initial={false}>
        {panelOpen && (
          <m.div
            id="transaction-filters"
            className={styles.panelWrap}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22 }}
          >
            <Card surface="solid" className={styles.panel}>
              <Select
                label="Expense type"
                value={filters.kind}
                onChange={(e) => set("kind", e.target.value as TxnKindFilter)}
                options={KIND_OPTIONS}
              />
              <Select
                label="Category"
                value={filters.category}
                onChange={(e) =>
                  set(
                    "category",
                    e.target.value as TransactionFilters["category"],
                  )
                }
                options={categoryOptions}
              />
              <Select
                label="Account"
                value={filters.accountId}
                onChange={(e) => set("accountId", e.target.value)}
                options={accountOptions}
              />
              <div className={styles.pair}>
                <Input
                  label="From"
                  type="date"
                  value={filters.from}
                  max={filters.to || undefined}
                  onChange={(e) => set("from", e.target.value)}
                />
                <Input
                  label="To"
                  type="date"
                  value={filters.to}
                  min={filters.from || undefined}
                  onChange={(e) => set("to", e.target.value)}
                />
              </div>
              <div className={styles.pair}>
                <Input
                  label="Min amount"
                  inputMode="decimal"
                  placeholder="0"
                  value={filters.minAmount}
                  onChange={(e) =>
                    set("minAmount", sanitizeAmount(e.target.value))
                  }
                />
                <Input
                  label="Max amount"
                  inputMode="decimal"
                  placeholder="Any"
                  value={filters.maxAmount}
                  onChange={(e) =>
                    set("maxAmount", sanitizeAmount(e.target.value))
                  }
                />
              </div>
            </Card>
          </m.div>
        )}
      </AnimatePresence>

      <div className={styles.summary}>
        <p role="status" aria-live="polite">
          {results.length === 0
            ? "No transactions"
            : visible.length < results.length
              ? `Showing ${visible.length} of ${results.length}`
              : `${results.length} transaction${results.length === 1 ? "" : "s"}`}
        </p>
        {hasAnyFilter && (
          <button
            type="button"
            className={styles.clear}
            onClick={() => {
              setFilters(EMPTY_FILTERS);
              setLimit(PAGE_SIZE);
            }}
          >
            <X size={14} />
            Clear filters
          </button>
        )}
      </div>

      {results.length === 0 ? (
        <Card surface="solid">
          <EmptyState
            icon={SearchX}
            title={hasAnyFilter ? "No matches" : "No transactions yet"}
            description={
              hasAnyFilter
                ? "Try a different search or clear some filters."
                : "Use the + button to log your first expense."
            }
          />
        </Card>
      ) : (
        groups.map((group) => {
          const net = group.items.reduce(
            (acc, t) => acc + (isBankTransfer(t) ? 0 : transactionDelta(t)),
            0,
          );
          return (
            <section
              key={group.month}
              className={styles.group}
              aria-labelledby={`month-${group.month}`}
            >
              <div className={styles.group_head}>
                <h2 id={`month-${group.month}`} className={styles.group_title}>
                  {monthLabel(group.month)}
                </h2>
                <span
                  className={cn(
                    styles.group_net,
                    net < 0
                      ? styles["group_net--out"]
                      : styles["group_net--in"],
                  )}
                >
                  {net < 0 ? "-" : net > 0 ? "+" : ""}
                  {formatCurrency(Math.abs(net), currency)}
                </span>
              </div>
              <Card surface="solid" padded={false} className={styles.list}>
                {group.items.map((t) => (
                  <TransactionItem
                    key={t.id}
                    transaction={t}
                    currency={currency}
                    onClick={setEditing}
                  />
                ))}
              </Card>
            </section>
          );
        })
      )}

      {visible.length < results.length && (
        <Button
          variant="secondary"
          fullWidth
          onClick={() => setLimit((n) => n + PAGE_SIZE)}
        >
          Show {Math.min(PAGE_SIZE, results.length - visible.length)} more
        </Button>
      )}

      {historyFrom && (
        <div className={styles.older}>
          <span>
            Includes history since {monthLabel(monthKey(historyFrom))}
          </span>
          <Button
            variant="ghost"
            size="sm"
            loading={historyLoading}
            onClick={searchOlder}
          >
            Load older
          </Button>
        </div>
      )}

      <EditTransactionSheet
        transaction={editing && !isBankTransfer(editing) ? editing : null}
        open={editing !== null && !isBankTransfer(editing)}
        onClose={() => setEditing(null)}
      />
      <TransferSheet
        transfer={editing && isBankTransfer(editing) ? editing : null}
        open={editing !== null && isBankTransfer(editing)}
        onClose={() => setEditing(null)}
      />
    </div>
  );
}

export default function TransactionsPage() {
  return (
    <Suspense fallback={null}>
      <TransactionsView />
    </Suspense>
  );
}
