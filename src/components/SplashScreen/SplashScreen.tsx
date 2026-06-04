import styles from "./SplashScreen.module.scss";

export const SplashScreen = () => (
  <div className={styles.splash}>
    <span className={styles.splash_aura} aria-hidden />
    <img
      src="/icons/moneyflow-logo-full.png"
      alt="moneyFlow"
      width={200}
      height={200}
      className={styles.splash_logo}
    />
    <span className={styles.splash_bar} aria-hidden>
      <span className={styles.splash_barFill} />
    </span>
  </div>
);
