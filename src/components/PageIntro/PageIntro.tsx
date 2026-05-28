import type { ReactNode } from "react";
import styles from "./PageIntro.module.scss";

interface PageIntroProps {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}

export const PageIntro = ({ title, subtitle, action }: PageIntroProps) => (
  <div className={styles.intro}>
    <div>
      <h1 className={styles.intro_title}>{title}</h1>
      {subtitle && <p className={styles.intro_subtitle}>{subtitle}</p>}
    </div>
    {action && <div className={styles.intro_action}>{action}</div>}
  </div>
);
