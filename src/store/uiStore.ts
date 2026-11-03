"use client";

import { create } from "zustand";
import { createId } from "@/utils";
import type { ToastMessage } from "@/types";

interface UiState {
  toasts: ToastMessage[];
  /** The monthly statement's amounts start hidden on every app load. */
  amountsHidden: boolean;
  toggleAmounts: () => void;
  pushToast: (toast: Omit<ToastMessage, "id">) => void;
  dismissToast: (id: string) => void;
}

const MAX_TOASTS = 4;

export const useUiStore = create<UiState>((set) => ({
  toasts: [],
  amountsHidden: true,
  toggleAmounts: () => set((s) => ({ amountsHidden: !s.amountsHidden })),
  pushToast: (toast) =>
    set((s) => {
      const duplicate = s.toasts.some(
        (t) =>
          t.title === toast.title &&
          t.description === toast.description &&
          t.variant === toast.variant,
      );
      if (duplicate && !toast.action) return s;
      const next = [...s.toasts, { ...toast, id: createId("toast") }];
      return { toasts: next.slice(-MAX_TOASTS) };
    }),
  dismissToast: (id) =>
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));
