"use client";

import { type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { Card } from "@/components/Card/Card";
import { cn } from "@/utils";
import styles from "./Collapsible.module.scss";

const BODY_TRANSITION = { duration: 0.28, ease: [0.16, 1, 0.3, 1] as const };

interface CollapsibleProps {
  open: boolean;
  onToggle: (open: boolean) => void;
  title: string;
  caption?: ReactNode;
  icon?: ReactNode;
  trailing?: ReactNode;
  children: ReactNode;
  className?: string;
}

export const Collapsible = ({
  open,
  onToggle,
  title,
  caption,
  icon,
  trailing,
  children,
  className,
}: CollapsibleProps) => (
  <Card surface="solid" padded={false} className={cn(styles.root, className)}>
    <button
      type="button"
      className={styles.head}
      onClick={() => onToggle(!open)}
      aria-expanded={open}
    >
      {icon && <span className={styles.icon}>{icon}</span>}
      <span className={styles.titles}>
        <span className={styles.title}>{title}</span>
        {caption != null && <span className={styles.caption}>{caption}</span>}
      </span>
      {trailing != null && <span className={styles.trailing}>{trailing}</span>}
      <motion.span
        className={styles.chevron}
        animate={{ rotate: open ? 180 : 0 }}
        transition={{ duration: 0.2 }}
      >
        <ChevronDown size={18} />
      </motion.span>
    </button>

    <AnimatePresence initial={false}>
      {open && (
        <motion.div
          className={styles.body}
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={BODY_TRANSITION}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  </Card>
);
