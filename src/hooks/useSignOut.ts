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
  const flushSync = useFinanceStore((s) => s.flushSync);
  const discardPendingSync = useFinanceStore((s) => s.discardPendingSync);
  const clearAuth = useAuthStore((s) => s.clear);

  return useCallback(async () => {
    await flushSync();
    const pending = useFinanceStore.getState().pendingSync;
    if (
      pending > 0 &&
      !window.confirm(
        `${pending} change${pending === 1 ? " hasn't" : "s haven't"} synced yet. Signing out now will discard ${pending === 1 ? "it" : "them"}. Sign out anyway?`,
      )
    ) {
      return;
    }
    discardPendingSync();
    try {
      await authService.signOut();
    } finally {
      clearAuth();
      resetAll();
      router.replace(ROUTES.login);
    }
  }, [router, resetAll, clearAuth, flushSync, discardPendingSync]);
};
