"use client";

import { create } from "zustand";

export interface SessionUser {
  id: string;
  email: string;
  fullName: string;
  username: string | null;
}

export type AuthStatus = "loading" | "authed" | "anon";

interface AuthState {
  user: SessionUser | null;
  status: AuthStatus;
  setUser: (user: SessionUser | null) => void;
  updateName: (fullName: string) => void;
  clear: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  status: "loading",
  setUser: (user) => set({ user, status: user ? "authed" : "anon" }),
  updateName: (fullName) =>
    set((state) => ({
      user: state.user ? { ...state.user, fullName } : state.user,
    })),
  clear: () => set({ user: null, status: "anon" }),
}));
