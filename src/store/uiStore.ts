"use client";

import { create } from "zustand";
import { createId } from "@/utils";
import type { ToastMessage } from "@/types";

interface UiState {
  toasts: ToastMessage[];
  pushToast: (toast: Omit<ToastMessage, "id">) => void;
  dismissToast: (id: string) => void;
}

export const useUiStore = create<UiState>((set) => ({
  toasts: [],
  pushToast: (toast) =>
    set((s) => ({ toasts: [...s.toasts, { ...toast, id: createId("toast") }] })),
  dismissToast: (id) =>
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));
