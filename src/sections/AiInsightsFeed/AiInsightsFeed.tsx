"use client";

import { useEffect } from "react";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  Lightbulb,
  PiggyBank,
  RefreshCw,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { Card } from "@/components/Card/Card";
import { Badge } from "@/components/Badge/Badge";
import { Button } from "@/components/Button/Button";
import { SkeletonCard } from "@/components/Skeleton/Skeleton";
import { useAiStore } from "@/store/aiStore";
import { useAiSnapshot } from "@/hooks/useAiSnapshot";
import { listItem, staggerContainer } from "@/themes/animations";
import type { InsightSeverity, InsightType } from "@/types";
import styles from "./AiInsightsFeed.module.scss";

const TYPE_ICON: Record<InsightType, typeof Sparkles> = {
  saving: PiggyBank,
  overspending: AlertTriangle,
  budgeting: Lightbulb,
  prediction: TrendingUp,
  optimization: Lightbulb,
  alert: AlertTriangle,
  summary: Sparkles,
};

const SEVERITY_TONE: Record<InsightSeverity, "lime" | "ocean" | "orange" | "danger"> = {
  positive: "lime",
  neutral: "ocean",
  warning: "orange",
  critical: "danger",
};

export const AiInsightsFeed = () => {
  const snapshot = useAiSnapshot();
  const insights = useAiStore((s) => s.insights);
  const summary = useAiStore((s) => s.summary);
  const loading = useAiStore((s) => s.loadingInsights);
  const generatedAt = useAiStore((s) => s.generatedAt);
  const generateInsights = useAiStore((s) => s.generateInsights);

  useEffect(() => {
    if (!generatedAt && !loading) generateInsights(snapshot);
  }, [generatedAt, loading, generateInsights, snapshot]);

  return (
    <section className={styles.feed}>
      <Card surface="gradient" glow="lime" className={styles.summary}>
        <span className={styles.summary_badge}>
          <Sparkles size={14} />
          This month
        </span>
        <p className={styles.summary_text}>
          {loading && !summary ? "Analysing your money…" : summary}
        </p>
        <Button
          variant="glass"
          size="sm"
          icon={RefreshCw}
          loading={loading}
          onClick={() => generateInsights(snapshot)}
          className={styles.summary_refresh}
        >
          Regenerate
        </Button>
      </Card>

      {loading && insights.length === 0 ? (
        <div className={styles.list}>
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : (
        <motion.div
          className={styles.list}
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
        >
          {insights.map((insight, index) => {
            const Icon = TYPE_ICON[insight.type];
            return (
              <motion.div key={`${insight.title}-${index}`} variants={listItem}>
                <Card surface="solid" className={styles.card}>
                  <div className={styles.card_head}>
                    <span
                      className={`${styles.card_icon} ${styles[`card_icon--${SEVERITY_TONE[insight.severity]}`]}`}
                    >
                      <Icon size={16} />
                    </span>
                    <span className={styles.card_title}>{insight.title}</span>
                    <Badge tone={SEVERITY_TONE[insight.severity]}>{insight.type}</Badge>
                  </div>
                  <p className={styles.card_body}>{insight.body}</p>
                </Card>
              </motion.div>
            );
          })}
        </motion.div>
      )}
    </section>
  );
};
