"use client";

import { useCallback } from "react";
import { useUiStore } from "@/store/uiStore";
import type { ToastMessage } from "@/types";

type ToastInput = Omit<ToastMessage, "id" | "variant"> & {
  variant?: ToastMessage["variant"];
};

export const useToast = () => {
  const pushToast = useUiStore((s) => s.pushToast);

  return useCallback(
    ({ variant = "info", ...rest }: ToastInput) => pushToast({ variant, ...rest }),
    [pushToast],
  );
};
