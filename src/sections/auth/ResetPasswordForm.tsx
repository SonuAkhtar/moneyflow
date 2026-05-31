"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, ArrowRight, Lock } from "lucide-react";
import { Input } from "@/components/Input/Input";
import { Button } from "@/components/Button/Button";
import { authService } from "@/services/auth.service";
import { getBrowserSupabase } from "@/lib/supabase/client";
import { useToast } from "@/hooks/useToast";
import { resetPasswordSchema, type ResetPasswordValues } from "@/utils/validation";
import { ROUTES } from "@/constants";
import styles from "./auth.module.scss";

export const ResetPasswordForm = () => {
  const router = useRouter();
  const toast = useToast();
  const [serverError, setServerError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const configured = getBrowserSupabase() !== null;

  useEffect(() => {
    const supabase = getBrowserSupabase();
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (session && (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN")) {
        setReady(true);
      }
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: "", confirmPassword: "" },
  });

  const submit = handleSubmit(async (values) => {
    setServerError(null);
    const result = await authService.updatePassword(values.password);
    if (!result.ok) {
      setServerError(result.message ?? "Couldn't update your password");
      return;
    }
    toast({ title: "Password updated", variant: "success" });
    router.replace(ROUTES.home);
  });

  return (
    <form className={styles.form} onSubmit={submit}>
      {(serverError || !configured) && (
        <div className={styles.alert}>
          <AlertCircle size={16} />
          {serverError ??
            "Supabase isn't configured. Add your keys to .env.local and restart."}
        </div>
      )}
      {!ready && configured && !serverError && (
        <p className={styles.footer}>Opening your secure reset link…</p>
      )}
      <Input
        label="New password"
        type="password"
        placeholder="••••••••"
        icon={Lock}
        autoComplete="new-password"
        error={errors.password?.message}
        {...register("password")}
      />
      <Input
        label="Confirm new password"
        type="password"
        placeholder="••••••••"
        icon={Lock}
        autoComplete="new-password"
        error={errors.confirmPassword?.message}
        {...register("confirmPassword")}
      />
      <Button
        type="submit"
        size="lg"
        fullWidth
        loading={isSubmitting}
        disabled={!ready || !configured}
        iconRight={ArrowRight}
      >
        Update password
      </Button>
      <p className={styles.footer}>
        <Link href={ROUTES.login}>Back to sign in</Link>
      </p>
    </form>
  );
};
