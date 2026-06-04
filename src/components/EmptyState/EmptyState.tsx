"use client";

import { m } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/utils";
import styles from "./EmptyState.module.scss";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export const EmptyState = ({
  icon: Icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) => (
  <m.div
    className={cn(styles.empty, className)}
    initial={{ opacity: 0, y: 12 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
  >
    <div className={styles.empty_orb}>
      <Icon size={26} />
    </div>
    <h4 className={styles.empty_title}>{title}</h4>
    {description && <p className={styles.empty_desc}>{description}</p>}
    {action && <div className={styles.empty_action}>{action}</div>}
  </m.div>
);
