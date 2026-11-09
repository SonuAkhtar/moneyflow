"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, m } from "framer-motion";
import {
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  ChevronDown,
  ChevronRight,
  Percent,
  PiggyBank,
  Plus,
  Search,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { Card } from "@/components/Card/Card";
import { Button } from "@/components/Button/Button";
import { Select } from "@/components/Select/Select";
import { SegmentedControl } from "@/components/SegmentedControl/SegmentedControl";
import { SectionHeader } from "@/components/SectionHeader/SectionHeader";
import { EmptyState } from "@/components/EmptyState/EmptyState";
import { Skeleton } from "@/components/Skeleton/Skeleton";
import { TransactionItem } from "@/components/TransactionItem/TransactionItem";
import { EditTransactionSheet } from "@/sections/EditTransactionSheet/EditTransactionSheet";
import { CategoryBudgets } from "@/sections/CategoryBudgets/CategoryBudgets";
import { TransferSheet } from "@/sections/TransferSheet/TransferSheet";
import { useAnalytics } from "@/hooks/useAnalytics";
import { useFinanceMetrics } from "@/hooks/useFinanceMetrics";
import { useFinanceStore } from "@/store/financeStore";
import {
  cn,
  currentMonthKey,
  formatCurrency,
  formatPercent,
  isBankTransfer,
  lastNMonthKeys,
  monthKey,
  monthLabel,
} from "@/utils";
import { ROUTES } from "@/constants";
import { staggerContainer, listItem } from "@/themes/animations";
import type { Transaction } from "@/types";
import styles from "./page.module.scss";

function ChartFallback() {
  return <Skeleton height={210} radius="var(--radius-md)" />;
}

const AreaTrendChart = dynamic(
  () => import("@/components/charts").then((m) => m.AreaTrendChart),
  { ssr: false, loading: ChartFallback },
);
const CategoryDonut = dynamic(
  () => import("@/components/charts").then((m) => m.CategoryDonut),
  { ssr: false, loading: ChartFallback },
);
const SpendBarChart = dynamic(
  () => import("@/components/charts").then((m) => m.SpendBarChart),
  { ssr: false, loading: ChartFallback },
);

type View = "overview" | "categories" | "daily";

const HISTORY_MONTH_OPTIONS = 36;
const TREND_MONTHS = 6;

export default function AnalyticsPage() {
  const router = useRouter();
  const [month, setMonth] = useState<string>(currentMonthKey());
  const { categoryBreakdown, monthlyTrend, dailySpend, topMerchants } =
    useAnalytics(month);
  const metrics = useFinanceMetrics(month);
  const prevMonth = useMemo(() => {
    const [y, mo] = month.split("-").map(Number);
    return monthKey(new Date(y ?? 0, (mo ?? 1) - 2, 1));
  }, [month]);
  const prev = useFinanceMetrics(prevMonth);
  const transactions = useFinanceStore((s) => s.transactions);
  const historyFrom = useFinanceStore((s) => s.historyFrom);
  const historyLoading = useFinanceStore((s) => s.historyLoading);
  const loadHistory = useFinanceStore((s) => s.loadHistory);
  const earliestMonth = lastNMonthKeys(TREND_MONTHS, month)[0]!;
  useEffect(() => {
    void loadHistory(earliestMonth);
  }, [earliestMonth, historyFrom, loadHistory]);
  const currency = useFinanceStore((s) => s.profile?.currency ?? "INR");
  const [view, setView] = useState<View>("overview");
  const [editing, setEditing] = useState<Transaction | null>(null);
  const totalSpend = categoryBreakdown.reduce((acc, c) => acc + c.value, 0);
  const spentByCategory = useMemo(
    () => Object.fromEntries(categoryBreakdown.map((c) => [c.id, c.value])),
    [categoryBreakdown],
  );

  const fmt = (n: number) => formatCurrency(n, currency, { compact: true });

  const logExpenseCta = (
    <Button
      variant="secondary"
      icon={Plus}
      onClick={() => router.push(ROUTES.home)}
    >
      Log an expense
    </Button>
  );

  const monthOptions = lastNMonthKeys(HISTORY_MONTH_OPTIONS)
    .slice()
    .reverse()
    .map((key) => ({ label: monthLabel(key), value: key }));

  const groups = useMemo(() => {
    const inMonth = transactions
      .filter((t) => monthKey(t.occurredAt) === month)
      .sort((a, b) => +new Date(b.occurredAt) - +new Date(a.occurredAt));
    return {
      income: inMonth.filter((t) => t.type === "income"),
      major: inMonth.filter((t) => t.type === "expense" && t.isBigExpense),
      daily: inMonth.filter((t) => t.type === "expense" && !t.isBigExpense),
    };
  }, [transactions, month]);

  const kpis = [
    {
      key: "income",
      label: "Income",
      value: fmt(metrics.monthIncome),
      tone: "in" as const,
      icon: TrendingUp,
      delta: metrics.monthIncome - prev.monthIncome,
      goodUp: true,
      unit: "money" as const,
    },
    {
      key: "spent",
      label: "Spent",
      value: fmt(metrics.monthExpenses),
      tone: "out" as const,
      icon: TrendingDown,
      delta: metrics.monthExpenses - prev.monthExpenses,
      goodUp: false,
      unit: "money" as const,
    },
    {
      key: "saved",
      label: "Net saved",
      value: fmt(metrics.monthSaved),
      tone: (metrics.monthSaved >= 0 ? "save" : "out") as "save" | "out",
      icon: PiggyBank,
      delta: metrics.monthSaved - prev.monthSaved,
      goodUp: true,
      unit: "money" as const,
    },
    {
      key: "rate",
      label: "Savings rate",
      value: `${metrics.savingsRate}%`,
      tone: "rate" as const,
      icon: Percent,
      delta: metrics.savingsRate - prev.savingsRate,
      goodUp: true,
      unit: "pts" as const,
    },
  ];

  return (
    <m.div
      className={styles.page}
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
    >
      <m.div variants={listItem}>
        <Link href={ROUTES.transactions} className={styles.searchLink}>
          <Search size={18} />
          <span>Search and filter all transactions</span>
          <ChevronRight size={16} />
        </Link>
      </m.div>

      <>
        <m.div variants={listItem}>
          <Select
            aria-label="Select month"
            className={styles.monthSelect}
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            options={monthOptions}
          />
          {historyLoading && (
            <p className={styles.older} role="status">
              Loading {monthLabel(month)}...
            </p>
          )}
          <SegmentedControl<View>
            className={styles.segments}
            segments={[
              { label: "Overview", value: "overview" },
              { label: "Categories", value: "categories" },
              { label: "Daily", value: "daily" },
            ]}
            value={view}
            onChange={setView}
          />
        </m.div>

        <m.div className={styles.kpis} variants={listItem}>
          {kpis.map((kpi) => {
            const Icon = kpi.icon;
            const up = kpi.delta > 0;
            const good = kpi.goodUp ? kpi.delta > 0 : kpi.delta < 0;
            return (
              <Card
                key={kpi.key}
                surface="solid"
                padded={false}
                className={styles.kpi}
                data-tone={kpi.tone}
              >
                <div className={styles.kpi_top}>
                  <span className={styles.kpi_icon}>
                    <Icon size={15} />
                  </span>
                  {kpi.delta !== 0 && (
                    <span
                      className={cn(
                        styles.kpi_delta,
                        good
                          ? styles["kpi_delta--good"]
                          : styles["kpi_delta--bad"],
                      )}
                    >
                      {up ? (
                        <ArrowUpRight size={12} />
                      ) : (
                        <ArrowDownRight size={12} />
                      )}
                      {kpi.unit === "pts"
                        ? `${Math.abs(kpi.delta)}`
                        : fmt(Math.abs(kpi.delta))}
                    </span>
                  )}
                </div>
                <span
                  className={`${styles.kpi_value} ${styles[`kpi_value--${kpi.tone}`]}`}
                >
                  {kpi.value}
                </span>
                <span className={styles.kpi_label}>{kpi.label}</span>
              </Card>
            );
          })}
        </m.div>

        {view === "overview" && (
          <m.div variants={listItem}>
            <Card surface="solid">
              <SectionHeader
                title="Income vs Spending"
                caption={`6 months to ${monthLabel(month)}`}
              />
              <AreaTrendChart data={monthlyTrend} currency={currency} />
              <div className={styles.legend}>
                <span className={styles.legend_item}>
                  <span
                    className={`${styles.legend_dot} ${styles["legend_dot--lime"]}`}
                  />
                  Income
                </span>
                <span className={styles.legend_item}>
                  <span
                    className={`${styles.legend_dot} ${styles["legend_dot--orange"]}`}
                  />
                  Expenses
                </span>
              </div>
            </Card>
          </m.div>
        )}

        {view === "overview" && (
          <m.div variants={listItem}>
            <Card surface="solid" className={styles.trend}>
              <SectionHeader
                title="Net saved per month"
                caption="Income minus everything spent"
              />
              <SpendBarChart
                data={monthlyTrend.map((t) => ({
                  label: t.label,
                  value: t.saved,
                }))}
                currency={currency}
                uniformColor="var(--chart-saved)"
              />
            </Card>
          </m.div>
        )}

        {view === "categories" && (
          <m.div variants={listItem}>
            {totalSpend === 0 ? (
              <Card surface="solid">
                <EmptyState
                  icon={BarChart3}
                  title="No spending yet"
                  description="Log expenses to unlock category analytics."
                  action={logExpenseCta}
                />
              </Card>
            ) : (
              <Card surface="solid">
                <SectionHeader title="Where it goes" caption="By category" />
                <CategoryDonut
                  data={categoryBreakdown}
                  total={totalSpend}
                  currency={currency}
                />
                <ul className={styles.cats}>
                  {categoryBreakdown.slice(0, 6).map((cat) => (
                    <li key={cat.id} className={styles.cats_item}>
                      <span
                        className={styles.cats_dot}
                        style={{ background: cat.color }}
                      />
                      <span className={styles.cats_name}>{cat.label}</span>
                      <span className={styles.cats_share}>
                        {formatPercent(cat.share)}
                      </span>
                      <span className={styles.cats_value}>
                        {formatCurrency(cat.value, currency)}
                      </span>
                    </li>
                  ))}
                </ul>
                <div className={styles.catsFoot}>
                  <span>Daily average {fmt(metrics.dailyAverage)}</span>
                  {metrics.bigExpenseTotal > 0 && (
                    <span>Big spends {fmt(metrics.bigExpenseTotal)}</span>
                  )}
                </div>
              </Card>
            )}
          </m.div>
        )}

        {view === "categories" && (
          <m.div variants={listItem}>
            <CategoryBudgets
              spentByCategory={spentByCategory}
              currency={currency}
            />
          </m.div>
        )}

        {view === "daily" && (
          <m.div variants={listItem}>
            <Card surface="solid">
              <SectionHeader
                title="Daily spending"
                caption={monthLabel(month)}
              />
              {dailySpend.length === 0 ? (
                <EmptyState
                  icon={BarChart3}
                  title="Nothing logged"
                  description="Your daily spend chart will appear here."
                  action={logExpenseCta}
                />
              ) : (
                <SpendBarChart data={dailySpend} currency={currency} />
              )}
            </Card>
          </m.div>
        )}

        <m.div variants={listItem}>
          <SectionHeader title="Top merchants" caption={monthLabel(month)} />
          <Card surface="solid" padded={false} className={styles.merchants}>
            {topMerchants.length === 0 ? (
              <EmptyState
                icon={BarChart3}
                title="No merchants yet"
                description="Add a merchant when you log an expense to see where your money goes."
              />
            ) : (
              topMerchants.map((merchant, index) => (
                <div key={merchant.name} className={styles.merchant}>
                  <span className={styles.merchant_rank}>{index + 1}</span>
                  <span className={styles.merchant_name}>{merchant.name}</span>
                  <span className={styles.merchant_count}>
                    {merchant.count}×
                  </span>
                  <span className={styles.merchant_value}>
                    {formatCurrency(merchant.value, currency)}
                  </span>
                </div>
              ))
            )}
          </Card>
        </m.div>

        <m.div className={styles.groups} variants={listItem}>
          <MonthGroup
            title="Income"
            items={groups.income}
            currency={currency}
            onEdit={setEditing}
            tone="in"
          />
          <MonthGroup
            title="Major expenses"
            items={groups.major}
            currency={currency}
            onEdit={setEditing}
            tone="out"
          />
          <MonthGroup
            title="Daily expenses"
            items={groups.daily}
            currency={currency}
            onEdit={setEditing}
            tone="out"
          />
        </m.div>
      </>

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
    </m.div>
  );
}

interface MonthGroupProps {
  title: string;
  items: Transaction[];
  currency: string;
  tone: "in" | "out";
  onEdit: (transaction: Transaction) => void;
}

function MonthGroup({ title, items, currency, tone, onEdit }: MonthGroupProps) {
  const [open, setOpen] = useState(false);
  const total = items.reduce((acc, t) => acc + t.amount, 0);

  return (
    <Card surface="solid" padded={false} className={styles.group}>
      <button
        type="button"
        className={styles.group_head}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <span className={styles.group_titles}>
          <span className={styles.group_title}>{title}</span>
          <span className={styles.group_count}>{items.length} entries</span>
        </span>
        <span
          className={`${styles.group_total} ${styles[`group_total--${tone}`]}`}
        >
          {tone === "out" && total > 0 ? "-" : ""}
          {formatCurrency(total, currency)}
        </span>
        <m.span
          className={styles.group_chevron}
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronDown size={18} />
        </m.span>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <m.div
            className={styles.group_body}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.26, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className={styles.group_list}>
              {items.length === 0 ? (
                <p className={styles.group_empty}>
                  Nothing recorded this month.
                </p>
              ) : (
                items.map((transaction) => (
                  <TransactionItem
                    key={transaction.id}
                    transaction={transaction}
                    currency={currency}
                    onClick={onEdit}
                  />
                ))
              )}
            </div>
          </m.div>
        )}
      </AnimatePresence>
    </Card>
  );
}
