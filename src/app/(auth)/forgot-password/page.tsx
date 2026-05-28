import type { Metadata } from "next";
import { AuthLayout } from "@/layouts/AuthLayout/AuthLayout";
import { ForgotPasswordForm } from "@/sections/auth/ForgotPasswordForm";

export const metadata: Metadata = { title: "Reset password" };

export default function ForgotPasswordPage() {
  return (
    <AuthLayout
      title="Reset password"
      subtitle="We'll email you a secure link to set a new one."
    >
      <ForgotPasswordForm />
    </AuthLayout>
  );
}
