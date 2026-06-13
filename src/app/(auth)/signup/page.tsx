import type { Metadata } from "next";
import { AuthLayout } from "@/layouts/AuthLayout/AuthLayout";
import { SignupForm } from "@/sections/auth/SignupForm";

export const metadata: Metadata = { title: "Create account" };

export default function SignupPage() {
  return (
    <AuthLayout
      title="Create your account"
      subtitle="Start tracking smarter in under a minute."
    >
      <SignupForm />
    </AuthLayout>
  );
}
