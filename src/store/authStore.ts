"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { APP } from "@/constants";

interface SessionUser {
  id: string;
  email: string;
  fullName: string;
}

interface AuthState {
  user: SessionUser | null;
  isAuthenticated: boolean;
  hasHydrated: boolean;
  setUser: (user: SessionUser) => void;
  updateName: (fullName: string) => void;
  clear: () => void;
  setHydrated: (value: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      hasHydrated: false,
      setUser: (user) => set({ user, isAuthenticated: true }),
      updateName: (fullName) =>
        set((state) => ({
          user: state.user ? { ...state.user, fullName } : state.user,
        })),
      clear: () => set({ user: null, isAuthenticated: false }),
      setHydrated: (value) => set({ hasHydrated: value }),
    }),
    {
      name: `${APP.storageKeys.settings}-auth`,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => (state) => state?.setHydrated(true),
    },
  ),
);
