"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import { BarChart3 } from "lucide-react";
import { PageIntro } from "@/components/PageIntro/PageIntro";
import { Card } from "@/components/Card/Card";
import { SegmentedControl } from "@/components/SegmentedControl/SegmentedControl";
import { SectionHeader } from "@/components/SectionHeader/SectionHeader";
import { EmptyState } from "@/components/EmptyState/EmptyState";
import { Skeleton } from "@/components/Skeleton/Skeleton";
import { useAnalytics, currentMonthTitle } from "@/hooks/useAnalytics";
import { useFinanceStore } from "@/store/financeStore";
import { formatCurrency, formatPercent } from "@/utils";
import { staggerContainer, listItem } from "@/themes/animations";
import styles from "./page.module.scss";

function ChartFallback() {
  return <Skeleton height={210} radius="var(--radius-md)" />;
}

const AreaTrendChart = dynamic(
  () => import("@/components/charts/AreaTrendChart").then((m) => m.AreaTrendChart),
  { ssr: false, loading: ChartFallback },
);
const CategoryDonut = dynamic(
  () => import("@/components/charts/CategoryDonut").then((m) => m.CategoryDonut),
  { ssr: false, loading: ChartFallback },
);
const SpendBarChart = dynamic(
  () => import("@/components/charts/SpendBarChart").then((m) => m.SpendBarChart),
  { ssr: false, loading: ChartFallback },
);

type View = "overview" | "categories" | "daily";

export default function AnalyticsPage() {
  const { categoryBreakdown, monthlyTrend, dailySpend, topMerchants } = useAnalytics();
  const currency = useFinanceStore((s) => s.profile?.currency ?? "INR");
  const [view, setView] = useState<View>("overview");
  const totalSpend = categoryBreakdown.reduce((acc, c) => acc + c.value, 0);

  return (
    <motion.div
      className={styles.page}
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
    >
      <motion.div variants={listItem}>
        <PageIntro title="Analytics" subtitle={currentMonthTitle()} />
        <SegmentedControl<View>
          segments={[
            { label: "Overview", value: "overview" },
            { label: "Categories", value: "categories" },
            { label: "Daily", value: "daily" },
          ]}
          value={view}
          onChange={setView}
        />
      </motion.div>

      {view === "overview" && (
        <motion.div variants={listItem}>
          <Card surface="solid">
            <SectionHeader title="Income vs Spending" caption="Last 6 months" />
            <AreaTrendChart data={monthlyTrend} currency={currency} />
            <div className={styles.legend}>
              <span className={styles.legend_item}>
                <span className={`${styles.legend_dot} ${styles["legend_dot--lime"]}`} />
                Income
              </span>
              <span className={styles.legend_item}>
                <span className={`${styles.legend_dot} ${styles["legend_dot--orange"]}`} />
                Expenses
              </span>
            </div>
          </Card>
        </motion.div>
      )}

      {view === "categories" && (
        <motion.div variants={listItem}>
          {totalSpend === 0 ? (
            <Card surface="solid">
              <EmptyState
                icon={BarChart3}
                title="No spending yet"
                description="Log expenses to unlock category analytics."
              />
            </Card>
          ) : (
            <Card surface="solid">
              <SectionHeader title="Where it goes" caption="By category" />
              <CategoryDonut data={categoryBreakdown} total={totalSpend} currency={currency} />
              <ul className={styles.cats}>
                {categoryBreakdown.slice(0, 6).map((cat) => (
                  <li key={cat.id} className={styles.cats_item}>
                    <span className={styles.cats_dot} style={{ background: cat.color }} />
                    <span className={styles.cats_name}>{cat.label}</span>
                    <span className={styles.cats_share}>{formatPercent(cat.share)}</span>
                    <span className={styles.cats_value}>
                      {formatCurrency(cat.value, currency)}
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </motion.div>
      )}

      {view === "daily" && (
        <motion.div variants={listItem}>
          <Card surface="solid">
            <SectionHeader title="Daily spending" caption={currentMonthTitle()} />
            {dailySpend.length === 0 ? (
              <EmptyState
                icon={BarChart3}
                title="Nothing logged"
                description="Your daily spend chart will appear here."
              />
            ) : (
              <SpendBarChart data={dailySpend} currency={currency} />
            )}
          </Card>
        </motion.div>
      )}

      <motion.div variants={listItem}>
        <SectionHeader title="Top merchants" caption="This month" />
        <Card surface="solid" padded={false} className={styles.merchants}>
          {topMerchants.length === 0 ? (
            <EmptyState icon={BarChart3} title="No merchants yet" />
          ) : (
            topMerchants.map((merchant, index) => (
              <div key={merchant.name} className={styles.merchant}>
                <span className={styles.merchant_rank}>{index + 1}</span>
                <span className={styles.merchant_name}>{merchant.name}</span>
                <span className={styles.merchant_count}>{merchant.count}×</span>
                <span className={styles.merchant_value}>
                  {formatCurrency(merchant.value, currency)}
                </span>
              </div>
            ))
          )}
        </Card>
      </motion.div>
    </motion.div>
  );
}
