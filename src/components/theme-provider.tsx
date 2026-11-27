"use client";

import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  type AccentThemeId,
  accentThemes,
  defaultAccentTheme,
} from "@/config/site";

type Theme = "light" | "dark";

type ThemeContextValue = {
  accent: AccentThemeId;
  isDark: boolean;
  setAccent: (accent: AccentThemeId) => void;
  setTheme: (theme: Theme) => void;
  theme: Theme;
  toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);
const THEME_STORAGE_KEY = "mynewblog:theme";
const ACCENT_STORAGE_KEY = "mynewblog:accent";
const validAccents = new Set<string>(accentThemes.map((item) => item.id));

function isAccentThemeId(value: string | null): value is AccentThemeId {
  return Boolean(value && validAccents.has(value));
}

function getInitialTheme(): Theme {
  if (typeof window === "undefined") {
    return "light";
  }

  const stored = window.localStorage.getItem(THEME_STORAGE_KEY);

  if (stored === "light" || stored === "dark") {
    return stored;
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function getInitialAccent(): AccentThemeId {
  if (typeof window === "undefined") {
    return defaultAccentTheme;
  }

  const stored = window.localStorage.getItem(ACCENT_STORAGE_KEY);

  return isAccentThemeId(stored) ? stored : defaultAccentTheme;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(getInitialTheme);
  const [accent, setAccentState] = useState<AccentThemeId>(getInitialAccent);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", theme === "dark");
    root.style.colorScheme = theme;
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme]);

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.accent = accent;
    window.localStorage.setItem(ACCENT_STORAGE_KEY, accent);
  }, [accent]);

  const value = useMemo<ThemeContextValue>(
    () => ({
      accent,
      isDark: theme === "dark",
      setAccent: setAccentState,
      setTheme: setThemeState,
      theme,
      toggleTheme: () =>
        setThemeState((current) => (current === "dark" ? "light" : "dark")),
    }),
    [accent, theme],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useBlogTheme() {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error("useBlogTheme must be used inside ThemeProvider.");
  }

  return context;
}
