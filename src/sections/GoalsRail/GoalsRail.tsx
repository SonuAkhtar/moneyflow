"use client";

import { motion } from "framer-motion";
import { Plus, Target } from "lucide-react";
import { SectionHeader } from "@/components/SectionHeader/SectionHeader";
import { ProgressBar } from "@/components/ProgressBar/ProgressBar";
import { EmptyState } from "@/components/EmptyState/EmptyState";
import { Card } from "@/components/Card/Card";
import { useFinanceStore } from "@/store/financeStore";
import { goalProgress, formatCurrency } from "@/utils";
import { ROUTES } from "@/constants";
import styles from "./GoalsRail.module.scss";

export const GoalsRail = () => {
  const goals = useFinanceStore((s) => s.goals);
  const currency = useFinanceStore((s) => s.profile?.currency ?? "INR");
  const active = goals.filter((g) => g.status !== "paused");

  return (
    <section>
      <SectionHeader title="Saving goals" actionLabel="Manage" actionHref={ROUTES.goals} />
      {active.length === 0 ? (
        <Card surface="solid">
          <EmptyState
            icon={Target}
            title="No goals yet"
            description="Set a target and watch your progress grow."
          />
        </Card>
      ) : (
        <div className={styles.rail}>
          {active.map((goal) => {
            const pct = goalProgress(goal.savedAmount, goal.targetAmount);
            return (
              <motion.div
                key={goal.id}
                className={styles.card}
                whileTap={{ scale: 0.98 }}
                style={{ borderColor: `${goal.colorTag}40` }}
              >
                <div className={styles.card_top}>
                  <span
                    className={styles.card_dot}
                    style={{ background: goal.colorTag }}
                  />
                  <span className={styles.card_title}>{goal.title}</span>
                </div>
                <span className={styles.card_amount}>
                  {formatCurrency(goal.savedAmount, currency, { compact: true })}
                  <span className={styles.card_target}>
                    {" "}
                    / {formatCurrency(goal.targetAmount, currency, { compact: true })}
                  </span>
                </span>
                <ProgressBar
                  value={pct}
                  tone={goal.status === "completed" ? "lime" : "ocean"}
                  size="sm"
                />
                <span className={styles.card_pct}>
                  {goal.status === "completed" ? "Completed" : `${Math.round(pct)}% funded`}
                </span>
              </motion.div>
            );
          })}
          <a href={ROUTES.goals} className={styles.add}>
            <Plus size={20} />
            <span>New goal</span>
          </a>
        </div>
      )}
    </section>
  );
};
