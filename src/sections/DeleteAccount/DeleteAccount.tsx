"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/Button/Button";
import { Input } from "@/components/Input/Input";
import { BottomSheet } from "@/components/BottomSheet/BottomSheet";
import { useFinanceStore } from "@/store/financeStore";
import { useAuthStore } from "@/store/authStore";
import { useToast } from "@/hooks/useToast";
import { authService } from "@/services/auth.service";
import { ROUTES } from "@/constants";
import styles from "./DeleteAccount.module.scss";

const CONFIRM_WORD = "DELETE";

interface DeleteAccountProps {
  open: boolean;
  onClose: () => void;
}

export const DeleteAccount = ({ open, onClose }: DeleteAccountProps) => {
  const router = useRouter();
  const toast = useToast();
  const resetAll = useFinanceStore((s) => s.resetAll);
  const discardPendingSync = useFinanceStore((s) => s.discardPendingSync);
  const clearAuth = useAuthStore((s) => s.clear);
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);

  const close = () => {
    if (busy) return;
    onClose();
    setTyped("");
  };

  const confirm = async () => {
    if (typed !== CONFIRM_WORD || busy) return;
    setBusy(true);
    const result = await authService.deleteAccount();
    setBusy(false);
    if (!result.ok) {
      toast({
        title: "Couldn't delete account",
        description: result.message,
        variant: "error",
      });
      return;
    }
    discardPendingSync();
    navigator.serviceWorker?.controller?.postMessage({ type: "CLEAR_CACHES" });
    resetAll();
    clearAuth();
    toast({ title: "Your account and data were deleted", variant: "info" });
    router.replace(ROUTES.login);
  };

  return (
    <BottomSheet open={open} onClose={close} title="Delete your account?">
      <div className={styles.sheet}>
        <p className={styles.warning}>
          This permanently deletes your profile, banks, transactions, EMIs,
          borrowings and budgets. It can&apos;t be undone. Download a backup
          first if you want to keep a copy.
        </p>
        <Input
          label={`Type ${CONFIRM_WORD} to confirm`}
          value={typed}
          autoCapitalize="characters"
          autoComplete="off"
          onChange={(e) => setTyped(e.target.value.trim())}
        />
        <Button
          variant="danger"
          size="lg"
          fullWidth
          loading={busy}
          disabled={typed !== CONFIRM_WORD}
          onClick={() => void confirm()}
        >
          Delete my account
        </Button>
      </div>
    </BottomSheet>
  );
};
