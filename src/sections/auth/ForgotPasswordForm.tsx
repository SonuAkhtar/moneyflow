"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, ArrowRight, MailCheck, Mail } from "lucide-react";
import { Input } from "@/components/Input/Input";
import { Button } from "@/components/Button/Button";
import { authService } from "@/services/auth.service";
import { forgotPasswordSchema, type ForgotPasswordValues } from "@/utils/validation";
import { ROUTES } from "@/constants";
import styles from "./auth.module.scss";

export const ForgotPasswordForm = () => {
  const [sent, setSent] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  });

  const submit = handleSubmit(async (values) => {
    setServerError(null);
    const result = await authService.resetPassword(values.email);
    if (!result.ok) {
      setServerError(result.message ?? "Unable to send reset link");
      return;
    }
    setSent(true);
  });

  if (sent) {
    return (
      <div className={styles.success}>
        <span className={styles.success_orb}>
          <MailCheck size={28} />
        </span>
        <p className={styles.success_text}>
          We sent a reset link to <strong>{getValues("email")}</strong>. Check your inbox to
          continue.
        </p>
        <Button variant="secondary" fullWidth onClick={() => setSent(false)}>
          Use a different email
        </Button>
        <p className={styles.footer}>
          <Link href={ROUTES.login}>Back to sign in</Link>
        </p>
      </div>
    );
  }

  return (
    <form className={styles.form} onSubmit={submit}>
      {serverError && (
        <div className={styles.alert}>
          <AlertCircle size={16} />
          {serverError}
        </div>
      )}
      <Input
        label="Email"
        type="email"
        placeholder="you@example.com"
        icon={Mail}
        autoComplete="email"
        error={errors.email?.message}
        {...register("email")}
      />
      <Button type="submit" size="lg" fullWidth loading={isSubmitting} iconRight={ArrowRight}>
        Send reset link
      </Button>
      <p className={styles.footer}>
        Remembered it? <Link href={ROUTES.login}>Sign in</Link>
      </p>
    </form>
  );
};
