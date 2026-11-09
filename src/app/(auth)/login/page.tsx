import { Suspense } from "react";
import type { Metadata } from "next";
import { AuthLayout } from "@/layouts/AuthLayout/AuthLayout";
import { LinkErrorAlert, LoginForm } from "@/sections/auth/LoginForm";

export const metadata: Metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Sign in to keep your money in motion."
    >
      <Suspense>
        <LinkErrorAlert />
      </Suspense>
      <LoginForm />
    </AuthLayout>
  );
}
