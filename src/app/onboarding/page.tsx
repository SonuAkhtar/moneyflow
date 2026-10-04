import type { Metadata } from "next";
import { OnboardingFlow } from "@/sections/Onboarding/OnboardingFlow";

export const metadata: Metadata = {
  title: "Get started",
  robots: { index: false, follow: false },
};

export default function OnboardingPage() {
  return <OnboardingFlow />;
}
