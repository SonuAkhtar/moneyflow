"use client";

import { create } from "zustand";
import { createId } from "@/utils";
import type { ToastMessage } from "@/types";

interface UiState {
  toasts: ToastMessage[];
  quickAddOpen: boolean;
  notificationsOpen: boolean;
  pushToast: (toast: Omit<ToastMessage, "id">) => void;
  dismissToast: (id: string) => void;
  openQuickAdd: () => void;
  closeQuickAdd: () => void;
  toggleNotifications: (value?: boolean) => void;
}

export const useUiStore = create<UiState>((set) => ({
  toasts: [],
  quickAddOpen: false,
  notificationsOpen: false,
  pushToast: (toast) =>
    set((s) => ({
      toasts: [...s.toasts, { ...toast, id: createId("toast") }],
    })),
  dismissToast: (id) =>
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
  openQuickAdd: () => set({ quickAddOpen: true }),
  closeQuickAdd: () => set({ quickAddOpen: false }),
  toggleNotifications: (value) =>
    set((s) => ({ notificationsOpen: value ?? !s.notificationsOpen })),
}));
