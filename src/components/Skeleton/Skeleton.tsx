import { cn } from "@/utils";
import styles from "./Skeleton.module.scss";

interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  radius?: string;
  className?: string;
}

export const Skeleton = ({
  width,
  height,
  radius,
  className,
}: SkeletonProps) => (
  <span
    className={cn(styles.skeleton, className)}
    style={{ width, height, borderRadius: radius }}
  />
);

export const SkeletonCard = ({ lines = 3 }: { lines?: number }) => (
  <div className={styles.skeletonCard}>
    <Skeleton width="48%" height={16} radius="var(--radius-sm)" />
    {Array.from({ length: lines }).map((_, i) => (
      <Skeleton
        key={i}
        width={`${90 - i * 12}%`}
        height={12}
        radius="var(--radius-sm)"
      />
    ))}
  </div>
);
