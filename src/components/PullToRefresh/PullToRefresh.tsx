"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { m, useMotionValue, useTransform, animate } from "framer-motion";
import { RefreshCw } from "lucide-react";
import styles from "./PullToRefresh.module.scss";

const THRESHOLD = 70;
const MAX_PULL = 120;
const RESIST = 0.5;
const REST = 56;

interface PullToRefreshProps {
  onRefresh: () => Promise<void> | void;
  children: ReactNode;
}

export const PullToRefresh = ({ onRefresh, children }: PullToRefreshProps) => {
  const y = useMotionValue(0);
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef<number | null>(null);
  const pulling = useRef(false);
  const distance = useRef(0);
  const refreshingRef = useRef(false);

  useEffect(() => {
    const begin = (e: TouchEvent) => {
      if (refreshingRef.current) return;
      if (window.scrollY > 0) {
        startY.current = null;
        return;
      }
      startY.current = e.touches[0]?.clientY ?? null;
      pulling.current = false;
      distance.current = 0;
    };

    const move = (e: TouchEvent) => {
      if (refreshingRef.current || startY.current === null) return;
      const cur = e.touches[0]?.clientY ?? 0;
      const delta = cur - startY.current;
      if (delta <= 0 || window.scrollY > 0) {
        if (pulling.current) {
          pulling.current = false;
          distance.current = 0;
          y.set(0);
        }
        return;
      }
      pulling.current = true;
      const d = Math.min(MAX_PULL, delta * RESIST);
      distance.current = d;
      y.set(d);
    };

    const end = () => {
      if (refreshingRef.current) return;
      startY.current = null;
      const spring = { type: "spring" as const, stiffness: 400, damping: 40 };
      if (pulling.current && distance.current >= THRESHOLD) {
        pulling.current = false;
        refreshingRef.current = true;
        setRefreshing(true);
        animate(y, REST, spring);
        void Promise.resolve(onRefresh()).finally(() => {
          refreshingRef.current = false;
          setRefreshing(false);
          animate(y, 0, spring);
        });
      } else {
        pulling.current = false;
        distance.current = 0;
        animate(y, 0, spring);
      }
    };

    window.addEventListener("touchstart", begin, { passive: true });
    window.addEventListener("touchmove", move, { passive: true });
    window.addEventListener("touchend", end);
    window.addEventListener("touchcancel", end);
    return () => {
      window.removeEventListener("touchstart", begin);
      window.removeEventListener("touchmove", move);
      window.removeEventListener("touchend", end);
      window.removeEventListener("touchcancel", end);
    };
  }, [onRefresh, y]);

  const rotate = useTransform(y, [0, MAX_PULL], [0, 300]);
  const opacity = useTransform(y, [0, THRESHOLD * 0.4, THRESHOLD], [0, 0.5, 1]);
  const scale = useTransform(y, [0, THRESHOLD], [0.6, 1]);

  return (
    <>
      <m.div className={styles.indicator} style={{ y, opacity }} aria-hidden>
        <m.span
          className={styles.indicator_badge}
          style={{ scale, rotate: refreshing ? undefined : rotate }}
        >
          <RefreshCw
            size={18}
            className={refreshing ? styles.spin : undefined}
          />
        </m.span>
      </m.div>
      <m.div style={{ y }}>{children}</m.div>
    </>
  );
};
