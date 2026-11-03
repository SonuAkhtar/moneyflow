"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, m } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  PiggyBank,
  Sparkles,
  Wallet,
} from "lucide-react";
import { Input } from "@/components/Input/Input";
import { Select } from "@/components/Select/Select";
import { NumberInput } from "@/components/NumberInput/NumberInput";
import { Button } from "@/components/Button/Button";
import { SplashScreen } from "@/components/SplashScreen/SplashScreen";
import { authService } from "@/services/auth.service";
import { accountRepo, profileRepo } from "@/services/repositories";
import { useFinanceStore } from "@/store/financeStore";
import { useToast } from "@/hooks/useToast";
import { ONBOARDING_STEPS, ROUTES } from "@/constants";
import { CURRENCY_SELECT_OPTIONS, guessCurrency } from "@/constants/currencies";
import { getCurrencySymbol } from "@/utils";
import styles from "./OnboardingFlow.module.scss";

export const OnboardingFlow = () => {
  const router = useRouter();
  const toast = useToast();
  const [userId, setUserId] = useState<string | null>(null);
  const [resolved, setResolved] = useState(false);
  const [saving, setSaving] = useState(false);

  const [step, setStep] = useState(0);
  const [salary, setSalary] = useState("");
  const [target, setTarget] = useState("");
  const [accountName, setAccountName] = useState("");
  const [balance, setBalance] = useState("");
  const [accountId] = useState(() => crypto.randomUUID());
  const [currency, setCurrency] = useState(() =>
    guessCurrency(
      typeof navigator !== "undefined" ? navigator.languages : undefined,
    ),
  );
  const symbol = getCurrencySymbol(currency);
  const [transitioning, setTransitioning] = useState(false);
  const moved = useRef(false);
  // Move focus to each new step's heading, but not on first load.
  const focusHeading = useCallback((el: HTMLHeadingElement | null) => {
    if (el && moved.current) el.focus();
  }, []);

  useEffect(() => {
    let active = true;
    void (async () => {
      const session = await authService.currentSession();
      if (!active) return;
      if (!session?.userId) {
        router.replace(ROUTES.login);
        return;
      }
      const bundle = await profileRepo.get(session.userId).catch(() => null);
      if (!active) return;
      if (bundle?.profile.onboardingComplete) {
        router.replace(ROUTES.home);
        return;
      }
      setUserId(session.userId);
      setResolved(true);
    })();
    return () => {
      active = false;
    };
  }, [router]);

  if (!resolved || !userId) return <SplashScreen />;

  const isLast = step === ONBOARDING_STEPS.length - 1;
  const current = ONBOARDING_STEPS[step]!;

  const finish = async () => {
    if (saving) return;
    setSaving(true);
    try {
      await accountRepo.insert({
        id: accountId,
        userId,
        name: accountName.trim() || "Savings",
        type: "savings",
        balance: Number(balance) || 0,
        institution: null,
        colorTag: "#4ece6e",
        isPrimary: true,
        createdAt: new Date().toISOString(),
      });
      await profileRepo.update(userId, {
        monthlySalary: Number(salary) || 0,
        savingsTarget: Number(target) || 0,
        currency,
        onboardingComplete: true,
      });
      await useFinanceStore.getState().hydrate(userId);
      router.replace(ROUTES.home);
    } catch (err) {
      setSaving(false);
      toast({
        title: "Couldn't save",
        description: err instanceof Error ? err.message : "Please try again",
        variant: "error",
      });
    }
  };

  const goTo = (target: number) => {
    if (transitioning) return;
    moved.current = true;
    setTransitioning(true);
    setStep(target);
  };

  const next = () => (isLast ? void finish() : goTo(step + 1));

  return (
    <div className={styles.flow}>
      <div className={styles.flow_glow} aria-hidden />
      <div
        className={styles.flow_progress}
        role="progressbar"
        aria-label="Setup progress"
        aria-valuemin={1}
        aria-valuemax={ONBOARDING_STEPS.length}
        aria-valuenow={step + 1}
        aria-valuetext={`Step ${step + 1} of ${ONBOARDING_STEPS.length}`}
      >
        {ONBOARDING_STEPS.map((s, i) => (
          <span
            key={s.key}
            className={`${styles.flow_dot} ${i <= step ? styles["flow_dot--on"] : ""}`}
          />
        ))}
      </div>

      <AnimatePresence
        mode="wait"
        onExitComplete={() => setTransitioning(false)}
      >
        <m.div
          key={current.key}
          className={styles.flow_step}
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -24 }}
          transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
        >
          <span className={styles.flow_icon}>
            {step === 0 && <Sparkles size={26} />}
            {step === 1 && <Wallet size={26} />}
            {step === 2 && <PiggyBank size={26} />}
            {step === 3 && <Wallet size={26} />}
          </span>
          <h1 ref={focusHeading} tabIndex={-1} className={styles.flow_title}>
            {current.title}
          </h1>
          <p className={styles.flow_subtitle}>{current.subtitle}</p>

          <div className={styles.flow_body}>
            {step === 0 && (
              <Select
                label="Currency"
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                options={CURRENCY_SELECT_OPTIONS}
              />
            )}
            {step === 1 && (
              <NumberInput
                label={`Monthly salary (${symbol})`}
                inputMode="decimal"
                placeholder="0"
                value={salary}
                onChange={(e) => setSalary(e.target.value)}
              />
            )}
            {step === 2 && (
              <NumberInput
                label={`Monthly savings target (${symbol})`}
                inputMode="decimal"
                placeholder="0"
                value={target}
                onChange={(e) => setTarget(e.target.value)}
              />
            )}
            {step === 3 && (
              <>
                <Input
                  label="Bank name"
                  placeholder="e.g. Main savings account"
                  value={accountName}
                  onChange={(e) => setAccountName(e.target.value)}
                />
                <NumberInput
                  label={`Starting balance (${symbol})`}
                  inputMode="decimal"
                  placeholder="0"
                  value={balance}
                  onChange={(e) => setBalance(e.target.value)}
                />
              </>
            )}
          </div>
        </m.div>
      </AnimatePresence>

      <div className={styles.flow_actions}>
        <Button
          size="lg"
          fullWidth
          onClick={next}
          loading={isLast && saving}
          icon={isLast ? Check : undefined}
          iconRight={isLast ? undefined : ArrowRight}
        >
          {isLast ? "Enter moneyFlow" : "Continue"}
        </Button>
        {step > 0 && !isLast && (
          <Button variant="ghost" fullWidth onClick={() => void finish()}>
            Skip personalization
          </Button>
        )}
        {step > 0 && (
          <Button
            variant="ghost"
            fullWidth
            icon={ArrowLeft}
            onClick={() => goTo(step - 1)}
            disabled={saving}
          >
            Back
          </Button>
        )}
      </div>
    </div>
  );
};
