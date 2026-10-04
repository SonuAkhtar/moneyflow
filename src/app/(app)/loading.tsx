import { Skeleton } from "@/components/Skeleton/Skeleton";

export default function Loading() {
  return (
    <div style={{ display: "grid", gap: "16px" }} aria-busy="true">
      <Skeleton height={140} radius="var(--radius-lg)" />
      <Skeleton height={88} radius="var(--radius-md)" />
      <Skeleton height={88} radius="var(--radius-md)" />
    </div>
  );
}
