import type { Metadata } from "next";
import { AuthLayout } from "@/layouts/AuthLayout/AuthLayout";
import { ResetPasswordForm } from "@/sections/auth/ResetPasswordForm";

export const metadata: Metadata = { title: "Set a new password" };

export default function ResetPasswordPage() {
  return (
    <AuthLayout
      title="Set a new password"
      subtitle="Choose a strong password to secure your account."
    >
      <ResetPasswordForm />
    </AuthLayout>
  );
}
