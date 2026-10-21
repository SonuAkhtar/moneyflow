import { Skeleton } from "@/components/Skeleton/Skeleton";
import styles from "./PageLoader.module.scss";

export const PageLoader = () => (
  <div className={styles.loader} role="status" aria-live="polite">
    <span className="sr-only">Loading</span>
    <div className={styles.mark} aria-hidden>
      <span className={styles.mark_ring} />
      <img
        src="/icons/header-logo.png"
        alt=""
        width={34}
        height={34}
        className={styles.mark_logo}
      />
    </div>

    <div className={styles.cards} aria-hidden>
      <div className={styles.hero}>
        <Skeleton width="38%" height={10} radius="var(--radius-pill)" />
        <Skeleton width="62%" height={26} radius="var(--radius-sm)" />
        <div className={styles.row}>
          <Skeleton height={44} radius="var(--radius-sm)" />
          <Skeleton height={44} radius="var(--radius-sm)" />
        </div>
      </div>
      {[0, 1, 2].map((i) => (
        <div key={i} className={styles.item}>
          <Skeleton width={38} height={38} radius="var(--radius-md)" />
          <div className={styles.item_text}>
            <Skeleton width="55%" height={12} radius="var(--radius-pill)" />
            <Skeleton width="32%" height={10} radius="var(--radius-pill)" />
          </div>
          <Skeleton width={64} height={14} radius="var(--radius-pill)" />
        </div>
      ))}
    </div>
  </div>
);
