"use client";

import { CreditCard } from "lucide-react";
import { Card } from "@/components/Card/Card";
import { SectionHeader } from "@/components/SectionHeader/SectionHeader";
import { ProgressBar } from "@/components/ProgressBar/ProgressBar";
import { EmptyState } from "@/components/EmptyState/EmptyState";
import { Badge } from "@/components/Badge/Badge";
import { useFinanceStore } from "@/store/financeStore";
import { formatCurrency } from "@/utils";
import styles from "./EmiList.module.scss";

export const EmiList = () => {
  const emis = useFinanceStore((s) => s.emis);
  const currency = useFinanceStore((s) => s.profile?.currency ?? "INR");
  const active = emis.filter((e) => e.status === "active");

  return (
    <section>
      <SectionHeader title="EMIs & loans" caption={`${active.length} active`} />
      {active.length === 0 ? (
        <Card surface="solid">
          <EmptyState
            icon={CreditCard}
            title="No active EMIs"
            description="Loans you add will be tracked here."
          />
        </Card>
      ) : (
        <div className={styles.list}>
          {active.map((emi) => {
            const paid = emi.totalMonths - emi.remainingMonths;
            const pct = (paid / emi.totalMonths) * 100;
            return (
              <Card key={emi.id} surface="solid" className={styles.item}>
                <div className={styles.item_head}>
                  <span className={styles.item_icon}>
                    <CreditCard size={18} />
                  </span>
                  <div className={styles.item_info}>
                    <span className={styles.item_name}>{emi.name}</span>
                    <span className={styles.item_sub}>
                      Due day {emi.dueDay} · {emi.interestRate}% APR
                    </span>
                  </div>
                  <span className={styles.item_amount}>
                    {formatCurrency(emi.monthlyAmount, currency)}
                    <span className={styles.item_per}>/mo</span>
                  </span>
                </div>
                <ProgressBar value={pct} tone="ocean" size="sm" />
                <div className={styles.item_foot}>
                  <Badge tone="ocean">{paid}/{emi.totalMonths} paid</Badge>
                  <span className={styles.item_remaining}>
                    {emi.remainingMonths} months left
                  </span>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </section>
  );
};
