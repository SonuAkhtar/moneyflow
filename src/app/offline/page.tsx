import type { Metadata } from "next";
import { WifiOff } from "lucide-react";
import styles from "./page.module.scss";

export const metadata: Metadata = { title: "Offline" };

export default function OfflinePage() {
  return (
    <div className={styles.offline}>
      <span className={styles.offline_orb}>
        <WifiOff size={30} />
      </span>
      <h1 className={styles.offline_title}>You&apos;re offline</h1>
      <p className={styles.offline_text}>
        moneyFlow needs a connection for this view. Your cached data is still
        safe - reconnect to pick up where you left off.
      </p>
    </div>
  );
}
