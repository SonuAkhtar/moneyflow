"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, ArrowRight, AtSign, Lock, Mail, User } from "lucide-react";
import { Input } from "@/components/Input/Input";
import { Button } from "@/components/Button/Button";
import { authService } from "@/services/auth.service";
import { useAuthStore } from "@/store/authStore";
import { signUpSchema, type SignUpValues } from "@/utils/validation";
import { ROUTES } from "@/constants";
import { cn } from "@/utils";
import styles from "./auth.module.scss";

const scorePassword = (value: string): number => {
  let score = 0;
  if (value.length >= 8) score += 1;
  if (/[A-Z]/.test(value)) score += 1;
  if (/[0-9]/.test(value)) score += 1;
  if (/[^A-Za-z0-9]/.test(value)) score += 1;
  return score;
};

export const SignupForm = () => {
  const router = useRouter();
  const setUser = useAuthStore((s) => s.setUser);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<SignUpValues>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      fullName: "",
      username: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  const strength = scorePassword(watch("password") ?? "");

  const submit = handleSubmit(async (values) => {
    setServerError(null);
    const result = await authService.signUp(values);
    if (!result.ok) {
      setServerError(result.message ?? "Unable to create account");
      return;
    }
    if (result.needsVerification) {
      router.replace(`${ROUTES.verify}?email=${encodeURIComponent(values.email)}`);
      return;
    }
    setUser({
      id: result.userId ?? "local",
      email: values.email,
      fullName: values.fullName,
      username: result.username ?? values.username,
    });
    router.replace(ROUTES.onboarding);
  });

  return (
    <form className={styles.form} onSubmit={submit}>
      {serverError && (
        <div className={styles.alert}>
          <AlertCircle size={16} />
          {serverError}
        </div>
      )}
      <Input
        label="Full name"
        placeholder="Jordan Avery"
        icon={User}
        autoComplete="name"
        error={errors.fullName?.message}
        {...register("fullName")}
      />
      <Input
        label="Username"
        placeholder="jordan_a"
        icon={AtSign}
        autoComplete="username"
        autoCapitalize="none"
        error={errors.username?.message}
        {...register("username")}
      />
      <Input
        label="Email"
        type="email"
        placeholder="you@example.com"
        icon={Mail}
        autoComplete="email"
        error={errors.email?.message}
        {...register("email")}
      />
      <Input
        label="Password"
        type="password"
        placeholder="••••••••"
        icon={Lock}
        autoComplete="new-password"
        error={errors.password?.message}
        {...register("password")}
      />
      <div className={styles.strength}>
        {[0, 1, 2, 3].map((i) => (
          <span
            key={i}
            className={cn(styles.strength_bar, i < strength && styles["strength_bar--on"])}
          />
        ))}
      </div>
      <Input
        label="Confirm password"
        type="password"
        placeholder="••••••••"
        icon={Lock}
        autoComplete="new-password"
        error={errors.confirmPassword?.message}
        {...register("confirmPassword")}
      />
      <Button type="submit" size="lg" fullWidth loading={isSubmitting} iconRight={ArrowRight}>
        Create account
      </Button>
      <p className={styles.footer}>
        Already have an account? <Link href={ROUTES.login}>Sign in</Link>
      </p>
    </form>
  );
};
