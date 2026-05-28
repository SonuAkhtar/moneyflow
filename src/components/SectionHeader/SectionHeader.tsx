"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import styles from "./SectionHeader.module.scss";

interface SectionHeaderProps {
  title: string;
  caption?: string;
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
}

export const SectionHeader = ({
  title,
  caption,
  actionLabel,
  actionHref,
  onAction,
}: SectionHeaderProps) => (
  <div className={styles.header}>
    <div className={styles.header_text}>
      <h3 className={styles.header_title}>{title}</h3>
      {caption && <p className={styles.header_caption}>{caption}</p>}
    </div>
    {actionLabel &&
      (actionHref ? (
        <Link href={actionHref} className={styles.header_action}>
          {actionLabel}
          <ChevronRight size={15} />
        </Link>
      ) : (
        <button className={styles.header_action} onClick={onAction}>
          {actionLabel}
          <ChevronRight size={15} />
        </button>
      ))}
  </div>
);
