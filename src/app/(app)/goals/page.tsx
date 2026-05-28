"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Plus, Target, Trash2 } from "lucide-react";
import { PageIntro } from "@/components/PageIntro/PageIntro";
import { Card } from "@/components/Card/Card";
import { Button } from "@/components/Button/Button";
import { Badge } from "@/components/Badge/Badge";
import { ProgressBar } from "@/components/ProgressBar/ProgressBar";
import { EmptyState } from "@/components/EmptyState/EmptyState";
import { BottomSheet } from "@/components/BottomSheet/BottomSheet";
import { Input } from "@/components/Input/Input";
import { AddGoalSheet } from "@/sections/AddGoalSheet/AddGoalSheet";
import { useFinanceStore } from "@/store/financeStore";
import { useToast } from "@/hooks/useToast";
import { goalProgress, formatCurrency, dayLabel } from "@/utils";
import { staggerContainer, listItem } from "@/themes/animations";
import styles from "./page.module.scss";

export default function GoalsPage() {
  const goals = useFinanceStore((s) => s.goals);
  const currency = useFinanceStore((s) => s.profile?.currency ?? "INR");
  const contributeToGoal = useFinanceStore((s) => s.contributeToGoal);
  const deleteGoal = useFinanceStore((s) => s.deleteGoal);
  const toast = useToast();

  const [addOpen, setAddOpen] = useState(false);
  const [activeGoal, setActiveGoal] = useState<string | null>(null);
  const [amount, setAmount] = useState("");

  const contribute = () => {
    const value = Number(amount);
    if (!activeGoal || !value) return;
    contributeToGoal(activeGoal, value);
    toast({ title: "Contribution added", variant: "success" });
    setAmount("");
    setActiveGoal(null);
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
          title="Goals"
          subtitle="Save with intention"
          action={
            <Button size="sm" icon={Plus} onClick={() => setAddOpen(true)}>
              New
            </Button>
          }
        />
      </motion.div>

      {goals.length === 0 ? (
        <motion.div variants={listItem}>
          <Card surface="solid">
            <EmptyState
              icon={Target}
              title="No goals yet"
              description="Create your first saving goal to get started."
              action={
                <Button icon={Plus} onClick={() => setAddOpen(true)}>
                  Create goal
                </Button>
              }
            />
          </Card>
        </motion.div>
      ) : (
        goals.map((goal) => {
          const pct = goalProgress(goal.savedAmount, goal.targetAmount);
          const done = goal.status === "completed";
          return (
            <motion.div key={goal.id} variants={listItem}>
              <Card surface="solid" className={styles.goal}>
                <div className={styles.goal_head}>
                  <span className={styles.goal_dot} style={{ background: goal.colorTag }} />
                  <span className={styles.goal_title}>{goal.title}</span>
                  {done ? (
                    <Badge tone="lime">Done</Badge>
                  ) : (
                    <button
                      className={styles.goal_delete}
                      onClick={() => deleteGoal(goal.id)}
                      aria-label="Delete goal"
                    >
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>
                <div className={styles.goal_amounts}>
                  <span className={styles.goal_saved}>
                    {formatCurrency(goal.savedAmount, currency)}
                  </span>
                  <span className={styles.goal_target}>
                    of {formatCurrency(goal.targetAmount, currency)}
                  </span>
                </div>
                <ProgressBar value={pct} tone={done ? "lime" : "ocean"} />
                <div className={styles.goal_foot}>
                  <span className={styles.goal_meta}>
                    {goal.deadline ? `Target ${dayLabel(goal.deadline)}` : "No deadline"}
                  </span>
                  {!done && (
                    <Button
                      variant="secondary"
                      size="sm"
                      icon={Plus}
                      onClick={() => setActiveGoal(goal.id)}
                    >
                      Add funds
                    </Button>
                  )}
                </div>
              </Card>
            </motion.div>
          );
        })
      )}

      <AddGoalSheet open={addOpen} onClose={() => setAddOpen(false)} />

      <BottomSheet
        open={activeGoal !== null}
        onClose={() => setActiveGoal(null)}
        title="Add funds"
      >
        <div className={styles.contribute}>
          <Input
            label="Amount"
            type="number"
            inputMode="decimal"
            placeholder="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
          <Button size="lg" fullWidth onClick={contribute}>
            Contribute
          </Button>
        </div>
      </BottomSheet>
    </motion.div>
  );
}
