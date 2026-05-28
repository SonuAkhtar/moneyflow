"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Plus, Repeat, Trash2 } from "lucide-react";
import { PageIntro } from "@/components/PageIntro/PageIntro";
import { Card } from "@/components/Card/Card";
import { Button } from "@/components/Button/Button";
import { Badge } from "@/components/Badge/Badge";
import { Input } from "@/components/Input/Input";
import { Select } from "@/components/Select/Select";
import { BottomSheet } from "@/components/BottomSheet/BottomSheet";
import { EmptyState } from "@/components/EmptyState/EmptyState";
import { useFinanceStore } from "@/store/financeStore";
import { useToast } from "@/hooks/useToast";
import { getCategoryMeta } from "@/constants/categories";
import { EXPENSE_CATEGORIES } from "@/constants/categories";
import { sumBy, formatCurrency, dayLabel, isoNow } from "@/utils";
import { staggerContainer, listItem } from "@/themes/animations";
import type { CategoryId, SubscriptionCycle } from "@/types";
import styles from "./page.module.scss";

const CYCLE_FACTOR: Record<SubscriptionCycle, number> = {
  weekly: 52 / 12,
  monthly: 1,
  quarterly: 1 / 3,
  yearly: 1 / 12,
};

export default function SubscriptionsPage() {
  const subscriptions = useFinanceStore((s) => s.subscriptions);
  const currency = useFinanceStore((s) => s.profile?.currency ?? "INR");
  const toggle = useFinanceStore((s) => s.toggleSubscription);
  const remove = useFinanceStore((s) => s.deleteSubscription);
  const addSubscription = useFinanceStore((s) => s.addSubscription);
  const toast = useToast();

  const [addOpen, setAddOpen] = useState(false);
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [cycle, setCycle] = useState<SubscriptionCycle>("monthly");
  const [category, setCategory] = useState<CategoryId>("subscriptions");

  const monthlyTotal = sumBy(
    subscriptions.filter((s) => s.isActive),
    (s) => s.amount * CYCLE_FACTOR[s.cycle],
  );

  const submit = () => {
    if (!name.trim() || !Number(amount)) return;
    addSubscription({
      name: name.trim(),
      amount: Number(amount),
      cycle,
      category,
      nextChargeAt: isoNow(),
    });
    toast({ title: "Subscription added", description: name, variant: "success" });
    setName("");
    setAmount("");
    setAddOpen(false);
  };

  return (
    <motion.div
      className={styles.page}
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
    >
      <motion.div variants={listItem}>
        <PageIntro
          title="Subscriptions"
          subtitle="Recurring expenses"
          action={
            <Button size="sm" icon={Plus} onClick={() => setAddOpen(true)}>
              Add
            </Button>
          }
        />
        <Card surface="gradient" glow="orange" className={styles.total}>
          <span className={styles.total_label}>Monthly recurring</span>
          <span className={styles.total_value}>
            {formatCurrency(monthlyTotal, currency)}
          </span>
          <span className={styles.total_meta}>
            ≈ {formatCurrency(monthlyTotal * 12, currency)} per year
          </span>
        </Card>
      </motion.div>

      {subscriptions.length === 0 ? (
        <motion.div variants={listItem}>
          <Card surface="solid">
            <EmptyState
              icon={Repeat}
              title="No subscriptions"
              description="Track recurring charges so nothing slips through."
            />
          </Card>
        </motion.div>
      ) : (
        subscriptions.map((sub) => {
          const meta = getCategoryMeta(sub.category);
          return (
            <motion.div key={sub.id} variants={listItem}>
              <Card surface="solid" className={styles.sub}>
                <span
                  className={styles.sub_icon}
                  style={{ background: `${meta.color}1f`, color: meta.color }}
                >
                  <meta.icon size={18} />
                </span>
                <div className={styles.sub_info}>
                  <span className={styles.sub_name}>{sub.name}</span>
                  <span className={styles.sub_meta}>
                    {sub.cycle} · next {dayLabel(sub.nextChargeAt)}
                  </span>
                </div>
                <div className={styles.sub_right}>
                  <span className={styles.sub_amount}>
                    {formatCurrency(sub.amount, currency)}
                  </span>
                  <div className={styles.sub_actions}>
                    <button
                      className={styles.sub_toggle}
                      onClick={() => toggle(sub.id)}
                      aria-label="Toggle"
                    >
                      <Badge tone={sub.isActive ? "lime" : "neutral"} dot>
                        {sub.isActive ? "Active" : "Paused"}
                      </Badge>
                    </button>
                    <button
                      className={styles.sub_delete}
                      onClick={() => remove(sub.id)}
                      aria-label="Delete"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              </Card>
            </motion.div>
          );
        })
      )}

      <BottomSheet open={addOpen} onClose={() => setAddOpen(false)} title="Add subscription">
        <div className={styles.form}>
          <Input
            label="Name"
            placeholder="e.g. Spotify"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <Input
            label="Amount"
            type="number"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
          <Select
            label="Billing cycle"
            value={cycle}
            onChange={(e) => setCycle(e.target.value as SubscriptionCycle)}
            options={[
              { label: "Weekly", value: "weekly" },
              { label: "Monthly", value: "monthly" },
              { label: "Quarterly", value: "quarterly" },
              { label: "Yearly", value: "yearly" },
            ]}
          />
          <Select
            label="Category"
            value={category}
            onChange={(e) => setCategory(e.target.value as CategoryId)}
            options={EXPENSE_CATEGORIES.map((id) => ({
              label: getCategoryMeta(id).label,
              value: id,
            }))}
          />
          <Button size="lg" fullWidth onClick={submit}>
            Add subscription
          </Button>
        </div>
      </BottomSheet>
    </motion.div>
  );
}
