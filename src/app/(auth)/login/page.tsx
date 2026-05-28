import type { Metadata } from "next";
import { AuthLayout } from "@/layouts/AuthLayout/AuthLayout";
import { LoginForm } from "@/sections/auth/LoginForm";

export const metadata: Metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <AuthLayout title="Welcome back" subtitle="Sign in to keep your money in motion.">
      <LoginForm />
    </AuthLayout>
  );
}
