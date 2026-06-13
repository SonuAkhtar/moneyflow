"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, m } from "framer-motion";
import { ArrowRight, Check, PiggyBank, Sparkles, Wallet } from "lucide-react";
import { Input } from "@/components/Input/Input";
import { Button } from "@/components/Button/Button";
import { SplashScreen } from "@/components/SplashScreen/SplashScreen";
import { authService } from "@/services/auth.service";
import { accountRepo, profileRepo } from "@/services/repositories";
import { useToast } from "@/hooks/useToast";
import { ONBOARDING_STEPS, ROUTES } from "@/constants";
import styles from "./OnboardingFlow.module.scss";

export const OnboardingFlow = () => {
  const router = useRouter();
  const toast = useToast();
  const [userId, setUserId] = useState<string | null>(null);
  const [resolved, setResolved] = useState(false);
  const [saving, setSaving] = useState(false);

  const [step, setStep] = useState(0);
  const [salary, setSalary] = useState("85000");
  const [target, setTarget] = useState("25000");
  const [accountName, setAccountName] = useState("Everyday Savings");
  const [balance, setBalance] = useState("48000");

  useEffect(() => {
    let active = true;
    authService.currentSession().then((session) => {
      if (!active) return;
      if (session?.userId) setUserId(session.userId);
      else router.replace(ROUTES.login);
      setResolved(true);
    });
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
      await profileRepo.update(userId, {
        monthlySalary: Number(salary) || 0,
        savingsTarget: Number(target) || 0,
        onboardingComplete: true,
      });
      const name = accountName.trim();
      if (name) {
        await accountRepo.save({
          id: crypto.randomUUID(),
          userId,
          name,
          type: "savings",
          balance: Number(balance) || 0,
          institution: null,
          colorTag: "#4ece6e",
          isPrimary: true,
          createdAt: new Date().toISOString(),
        });
      }
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

  const next = () => (isLast ? void finish() : setStep((s) => s + 1));

  return (
    <div className={styles.flow}>
      <div className={styles.flow_glow} aria-hidden />
      <div className={styles.flow_progress}>
        {ONBOARDING_STEPS.map((s, i) => (
          <span
            key={s.key}
            className={`${styles.flow_dot} ${i <= step ? styles["flow_dot--on"] : ""}`}
          />
        ))}
      </div>

      <AnimatePresence mode="wait">
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
          <h1 className={styles.flow_title}>{current.title}</h1>
          <p className={styles.flow_subtitle}>{current.subtitle}</p>

          <div className={styles.flow_body}>
            {step === 1 && (
              <Input
                label="Monthly salary"
                type="number"
                inputMode="decimal"
                value={salary}
                onChange={(e) => setSalary(e.target.value)}
              />
            )}
            {step === 2 && (
              <Input
                label="Monthly savings target"
                type="number"
                inputMode="decimal"
                value={target}
                onChange={(e) => setTarget(e.target.value)}
              />
            )}
            {step === 3 && (
              <>
                <Input
                  label="Wallet name"
                  value={accountName}
                  onChange={(e) => setAccountName(e.target.value)}
                />
                <Input
                  label="Starting balance"
                  type="number"
                  inputMode="decimal"
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
      </div>
    </div>
  );
};
