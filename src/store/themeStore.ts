"use client";

import { create } from "zustand";

export type Theme = "light" | "dark";

const STORAGE_KEY = "mf-theme";

const applyTheme = (theme: Theme) => {
  if (typeof document !== "undefined") {
    document.documentElement.dataset.theme = theme;
  }
};

interface ThemeState {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  syncFromDocument: () => void;
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  theme: "light",
  setTheme: (theme) => {
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {}
    applyTheme(theme);
    set({ theme });
  },
  toggleTheme: () => get().setTheme(get().theme === "light" ? "dark" : "light"),
  syncFromDocument: () => {
    const current =
      (typeof document !== "undefined"
        ? (document.documentElement.dataset.theme as Theme | undefined)
        : undefined) ?? "light";
    set({ theme: current });
  },
}));
