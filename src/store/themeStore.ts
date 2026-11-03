"use client";

import { create } from "zustand";

export type Theme = "light" | "dark";

const STORAGE_KEY = "mf-theme";
const FONT_KEY = "mf-font";

export const FONTS = [
  { id: "bricolage", label: "Bricolage", note: "Bold and characterful" },
  { id: "jakarta", label: "Plus Jakarta", note: "Clean, modern fintech" },
  { id: "space", label: "Space Grotesk", note: "Technical and sharp" },
  { id: "fraunces", label: "Fraunces", note: "Soft editorial serif" },
  { id: "sora", label: "Sora", note: "Geometric and airy" },
] as const;

export type FontId = (typeof FONTS)[number]["id"];

const isFont = (value: unknown): value is FontId =>
  FONTS.some((f) => f.id === value);

// Same values as the themeColor entries in src/app/layout.tsx.
const THEME_COLORS: Record<Theme, string> = {
  light: "#f5f1e8",
  dark: "#17140f",
};

const applyThemeColor = (theme: Theme) => {
  document
    .querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]')
    .forEach((meta) => {
      meta.content = THEME_COLORS[theme];
    });
};

const applyTheme = (theme: Theme) => {
  if (typeof document !== "undefined") {
    document.documentElement.dataset.theme = theme;
    applyThemeColor(theme);
  }
};

interface ThemeState {
  theme: Theme;
  font: FontId;
  setTheme: (theme: Theme) => void;
  setFont: (font: FontId) => void;
  toggleTheme: () => void;
  syncFromDocument: () => void;
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  theme: "light",
  font: "bricolage",
  setFont: (font) => {
    try {
      localStorage.setItem(FONT_KEY, font);
    } catch {}
    document.documentElement.dataset.font = font;
    set({ font });
  },
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
    const font =
      typeof document !== "undefined"
        ? document.documentElement.dataset.font
        : undefined;
    if (typeof document !== "undefined") applyThemeColor(current);
    set({ theme: current, font: isFont(font) ? font : "bricolage" });
  },
}));
