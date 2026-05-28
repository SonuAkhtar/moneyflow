import Link from "next/link";
import { Compass } from "lucide-react";
import { ROUTES } from "@/constants";
import styles from "./offline/page.module.scss";

export default function NotFound() {
  return (
    <div className={styles.offline}>
      <span className={styles.offline_orb}>
        <Compass size={30} />
      </span>
      <h1 className={styles.offline_title}>Page not found</h1>
      <p className={styles.offline_text}>
        This route drifted off the map. Head back to your dashboard to keep things flowing.
      </p>
      <Link
        href={ROUTES.home}
        style={{
          color: "var(--color-lime)",
          fontWeight: 600,
          fontSize: "var(--font-sm)",
        }}
      >
        Back to home
      </Link>
    </div>
  );
}
