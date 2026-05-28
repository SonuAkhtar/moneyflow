"use client";

import { useEffect } from "react";
import Link from "next/link";
import { ArrowUpRight, Sparkles } from "lucide-react";
import { Card } from "@/components/Card/Card";
import { Skeleton } from "@/components/Skeleton/Skeleton";
import { useAiStore } from "@/store/aiStore";
import { useAiSnapshot } from "@/hooks/useAiSnapshot";
import { ROUTES } from "@/constants";
import styles from "./InsightTeaser.module.scss";

export const InsightTeaser = () => {
  const snapshot = useAiSnapshot();
  const insights = useAiStore((s) => s.insights);
  const summary = useAiStore((s) => s.summary);
  const loading = useAiStore((s) => s.loadingInsights);
  const generatedAt = useAiStore((s) => s.generatedAt);
  const generateInsights = useAiStore((s) => s.generateInsights);

  useEffect(() => {
    if (!generatedAt && !loading) generateInsights(snapshot);
  }, [generatedAt, loading, generateInsights, snapshot]);

  const top = insights[0];

  return (
    <Link href={ROUTES.insights} className={styles.link}>
      <Card surface="gradient" glow="orange" interactive className={styles.teaser}>
        <div className={styles.teaser_head}>
          <span className={styles.teaser_badge}>
            <Sparkles size={14} />
            AI insight
          </span>
          <ArrowUpRight size={18} className={styles.teaser_arrow} />
        </div>
        {loading || !top ? (
          <div className={styles.teaser_loading}>
            <Skeleton width="70%" height={16} radius="var(--radius-sm)" />
            <Skeleton width="92%" height={12} radius="var(--radius-sm)" />
          </div>
        ) : (
          <>
            <h4 className={styles.teaser_title}>{top.title}</h4>
            <p className={styles.teaser_body}>{summary || top.body}</p>
          </>
        )}
      </Card>
    </Link>
  );
};
