"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { useFinanceStore } from "@/store/financeStore";
import { useAuthStore } from "@/store/authStore";
import { authService } from "@/services/auth.service";
import { ROUTES } from "@/constants";

export const useSignOut = () => {
  const router = useRouter();
  const resetAll = useFinanceStore((s) => s.resetAll);
  const clearAuth = useAuthStore((s) => s.clear);

  return useCallback(async () => {
    await authService.signOut();
    clearAuth();
    resetAll();
    router.replace(ROUTES.login);
  }, [router, resetAll, clearAuth]);
};
