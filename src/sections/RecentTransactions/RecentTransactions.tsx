"use client";

import { useMemo } from "react";
import { Receipt } from "lucide-react";
import { Card } from "@/components/Card/Card";
import { SectionHeader } from "@/components/SectionHeader/SectionHeader";
import { TransactionItem } from "@/components/TransactionItem/TransactionItem";
import { EmptyState } from "@/components/EmptyState/EmptyState";
import { useFinanceStore } from "@/store/financeStore";
import { ROUTES } from "@/constants";
import styles from "./RecentTransactions.module.scss";

export const RecentTransactions = ({ limit = 5 }: { limit?: number }) => {
  const transactions = useFinanceStore((s) => s.transactions);
  const currency = useFinanceStore((s) => s.profile?.currency ?? "INR");

  const recent = useMemo(
    () =>
      [...transactions]
        .sort((a, b) => +new Date(b.occurredAt) - +new Date(a.occurredAt))
        .slice(0, limit),
    [transactions, limit],
  );

  return (
    <section>
      <SectionHeader
        title="Recent activity"
        actionLabel="See all"
        actionHref={ROUTES.calendar}
      />
      <Card surface="solid" padded={false} className={styles.list}>
        {recent.length === 0 ? (
          <EmptyState
            icon={Receipt}
            title="No transactions yet"
            description="Add your first expense to see it here."
          />
        ) : (
          recent.map((transaction) => (
            <TransactionItem
              key={transaction.id}
              transaction={transaction}
              currency={currency}
            />
          ))
        )}
      </Card>
    </section>
  );
};
