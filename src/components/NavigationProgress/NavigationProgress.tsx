"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { cn } from "@/utils";
import styles from "./NavigationProgress.module.scss";

const SHOW_AFTER_MS = 120;
const GIVE_UP_MS = 10_000;

type Phase = "idle" | "loading" | "done";

export const NavigationProgress = () => {
  const pathname = usePathname();
  const [phase, setPhase] = useState<Phase>("idle");
  const timers = useRef<number[]>([]);
  const pending = useRef(false);
  const shownPath = useRef(pathname);

  const clear = () => {
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
  };

  useEffect(() => {
    const start = () => {
      clear();
      pending.current = true;
      timers.current.push(
        window.setTimeout(() => {
          if (pending.current) setPhase("loading");
        }, SHOW_AFTER_MS),
        window.setTimeout(() => {
          pending.current = false;
          setPhase("idle");
        }, GIVE_UP_MS),
      );
    };

    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const anchor = (e.target as Element | null)?.closest?.("a[href]");
      if (!(anchor instanceof HTMLAnchorElement)) return;
      if (anchor.target && anchor.target !== "_self") return;
      if (anchor.hasAttribute("download")) return;
      const url = new URL(anchor.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      if (url.pathname === window.location.pathname) return;
      start();
    };

    document.addEventListener("click", onClick, true);
    const onPop = () => {
      if (window.location.pathname !== shownPath.current) start();
    };

    window.addEventListener("popstate", onPop);
    return () => {
      document.removeEventListener("click", onClick, true);
      window.removeEventListener("popstate", onPop);
      clear();
    };
  }, []);

  useEffect(() => {
    shownPath.current = pathname;
    if (!pending.current) return;
    pending.current = false;
    clear();
    setPhase((p) => (p === "loading" ? "done" : "idle"));
    timers.current.push(window.setTimeout(() => setPhase("idle"), 400));
  }, [pathname]);

  return (
    <div
      className={cn(
        styles.bar,
        phase === "loading" && styles["bar--loading"],
        phase === "done" && styles["bar--done"],
      )}
      role="progressbar"
      aria-label="Loading page"
      aria-hidden={phase === "idle"}
      aria-busy={phase === "loading"}
    >
      <span className={styles.bar_fill} />
    </div>
  );
};
