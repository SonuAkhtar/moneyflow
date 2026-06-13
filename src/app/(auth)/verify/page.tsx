"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { MailCheck } from "lucide-react";
import { AuthLayout } from "@/layouts/AuthLayout/AuthLayout";
import { Button } from "@/components/Button/Button";
import { authService } from "@/services/auth.service";
import { useToast } from "@/hooks/useToast";
import { ROUTES } from "@/constants";
import styles from "@/sections/auth/auth.module.scss";

const VerifyInner = () => {
  const params = useSearchParams();
  const emailParam = params.get("email");
  const email = emailParam ?? "your inbox";
  const toast = useToast();
  const [sending, setSending] = useState(false);

  const resend = async () => {
    if (!emailParam) {
      toast({
        title: "We don't have your email",
        description: "Sign up again to get a fresh verification link.",
        variant: "error",
      });
      return;
    }
    setSending(true);
    const result = await authService.resendVerification(emailParam);
    setSending(false);
    if (result.ok) {
      toast({ title: "Verification email sent", variant: "success" });
    } else {
      toast({
        title: "Couldn't resend",
        description: result.message,
        variant: "error",
      });
    }
  };

  return (
    <div className={styles.success}>
      <span className={styles.success_orb}>
        <MailCheck size={28} />
      </span>
      <p className={styles.success_text}>
        We sent a verification link to <strong>{email}</strong>. Confirm your
        email to unlock your dashboard.
      </p>
      <Button fullWidth loading={sending} onClick={resend}>
        Resend email
      </Button>
      <p className={styles.footer}>
        <Link href={ROUTES.login}>Back to sign in</Link>
      </p>
    </div>
  );
};

export default function VerifyPage() {
  return (
    <AuthLayout
      title="Verify your email"
      subtitle="One quick step to secure your account."
    >
      <Suspense fallback={null}>
        <VerifyInner />
      </Suspense>
    </AuthLayout>
  );
}
