import Link from "next/link";
import { ArrowLeft, Compass } from "lucide-react";
import { ROUTES } from "@/constants";
import styles from "./not-found.module.scss";

export default function NotFound() {
  return (
    <div className={styles.notfound}>
      <div className={styles.notfound_glow} aria-hidden />
      <div className={styles.notfound_card}>
        <span className={styles.notfound_eyebrow}>
          <Compass size={14} /> Error 404
        </span>
        <span className={styles.notfound_code}>404</span>
        <h1 className={styles.notfound_title}>This page drifted off the map</h1>
        <p className={styles.notfound_text}>
          The link may be broken, or the page may have moved. Let&apos;s get your
          money flowing again.
        </p>
        <Link href={ROUTES.home} className={styles.notfound_cta}>
          <ArrowLeft size={16} /> Back to dashboard
        </Link>
      </div>
    </div>
  );
}
