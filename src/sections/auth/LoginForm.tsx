"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, ArrowRight, Lock, User } from "lucide-react";
import { Input } from "@/components/Input/Input";
import { Button } from "@/components/Button/Button";
import { authService } from "@/services/auth.service";
import { useAuthStore } from "@/store/authStore";
import { signInSchema, type SignInValues } from "@/utils/validation";
import { ROUTES } from "@/constants";
import styles from "./auth.module.scss";

export const LoginForm = () => {
  const router = useRouter();
  const setUser = useAuthStore((s) => s.setUser);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignInValues>({
    resolver: zodResolver(signInSchema),
    defaultValues: { identifier: "", password: "" },
  });

  const submit = handleSubmit(async (values) => {
    setServerError(null);
    const result = await authService.signIn(values);
    if (!result.ok) {
      setServerError(result.message ?? "Unable to sign in");
      return;
    }
    setUser({
      id: result.userId ?? "local",
      email: result.email ?? values.identifier,
      fullName:
        result.fullName || result.username || values.identifier || "Member",
      username: result.username ?? null,
    });
    router.replace(ROUTES.home);
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
        label="Email or username"
        placeholder="you@example.com or jordan_a"
        icon={User}
        autoComplete="username"
        autoCapitalize="none"
        error={errors.identifier?.message}
        {...register("identifier")}
      />
      <Input
        label="Password"
        type="password"
        placeholder="••••••••"
        icon={Lock}
        autoComplete="current-password"
        error={errors.password?.message}
        {...register("password")}
      />
      <div className={styles.row}>
        <span />
        <Link href={ROUTES.forgotPassword} className={styles.link}>
          Forgot password?
        </Link>
      </div>
      <Button
        type="submit"
        size="lg"
        fullWidth
        loading={isSubmitting}
        iconRight={ArrowRight}
      >
        Sign in
      </Button>
      <p className={styles.footer}>
        New here? <Link href={ROUTES.signup}>Create an account</Link>
      </p>
    </form>
  );
};
