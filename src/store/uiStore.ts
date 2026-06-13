"use client";

import { create } from "zustand";
import { createId } from "@/utils";
import type { ToastMessage } from "@/types";

interface UiState {
  toasts: ToastMessage[];
  pushToast: (toast: Omit<ToastMessage, "id">) => void;
  dismissToast: (id: string) => void;
}

const MAX_TOASTS = 4;

export const useUiStore = create<UiState>((set) => ({
  toasts: [],
  pushToast: (toast) =>
    set((s) => {
      const duplicate = s.toasts.some(
        (t) =>
          t.title === toast.title &&
          t.description === toast.description &&
          t.variant === toast.variant,
      );
      if (duplicate) return s;
      const next = [...s.toasts, { ...toast, id: createId("toast") }];
      return { toasts: next.slice(-MAX_TOASTS) };
    }),
  dismissToast: (id) =>
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));
