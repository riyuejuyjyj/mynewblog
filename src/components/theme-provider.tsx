"use client";

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { flushSync } from "react-dom";

import {
  type AccentThemeId,
  accentThemes,
  defaultAccentTheme,
  type MotionLevel,
} from "@/config/site";

type Theme = "light" | "dark";

type TransitionOrigin = {
  x: number;
  y: number;
};

type ThemeContextValue = {
  accent: AccentThemeId;
  isDark: boolean;
  motionLevel: MotionLevel;
  petalsEnabled: boolean;
  setAccent: (accent: AccentThemeId) => void;
  setMotionLevel: (level: MotionLevel) => void;
  setPetalsEnabled: (enabled: boolean) => void;
  setTheme: (theme: Theme) => void;
  theme: Theme;
  toggleTheme: () => void;
  toggleThemeWithTransition: (origin?: TransitionOrigin) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);
const THEME_STORAGE_KEY = "mynewblog:theme";
const ACCENT_STORAGE_KEY = "mynewblog:accent";
const MOTION_STORAGE_KEY = "mynewblog:motion";
const PETALS_STORAGE_KEY = "mynewblog:petals";

const validAccents = new Set<string>(accentThemes.map((item) => item.id));

function isAccentThemeId(value: string | null): value is AccentThemeId {
  return Boolean(value && validAccents.has(value));
}

function isMotionLevel(value: string | null): value is MotionLevel {
  return value === "full" || value === "subtle" || value === "off";
}

function getInitialTheme(): Theme {
  if (typeof window === "undefined") return "light";
  const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
  if (stored === "light" || stored === "dark") return stored;
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function getInitialAccent(): AccentThemeId {
  if (typeof window === "undefined") return defaultAccentTheme;
  const stored = window.localStorage.getItem(ACCENT_STORAGE_KEY);
  return isAccentThemeId(stored) ? stored : defaultAccentTheme;
}

function getInitialMotionLevel(): MotionLevel {
  if (typeof window === "undefined") return "full";
  const stored = window.localStorage.getItem(MOTION_STORAGE_KEY);
  if (isMotionLevel(stored)) return stored;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ? "off"
    : "full";
}

function getInitialPetalsEnabled(): boolean {
  if (typeof window === "undefined") return true;
  const stored = window.localStorage.getItem(PETALS_STORAGE_KEY);
  if (stored === "false") return false;
  if (stored === "true") return true;
  return !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function applyThemeToDom(nextTheme: Theme) {
  const root = document.documentElement;
  root.classList.toggle("dark", nextTheme === "dark");
  root.style.colorScheme = nextTheme;
  window.localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
}

type ViewTransitionDocument = Document & {
  startViewTransition?: (callback: () => void) => {
    ready: Promise<void>;
  };
};

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(getInitialTheme);
  const [accent, setAccentState] = useState<AccentThemeId>(getInitialAccent);
  const [motionLevel, setMotionLevelState] = useState<MotionLevel>(
    getInitialMotionLevel,
  );
  const [petalsEnabled, setPetalsEnabledState] = useState<boolean>(
    getInitialPetalsEnabled,
  );

  useEffect(() => {
    applyThemeToDom(theme);
  }, [theme]);

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.accent = accent;
    window.localStorage.setItem(ACCENT_STORAGE_KEY, accent);
  }, [accent]);

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.motion = motionLevel;
    window.localStorage.setItem(MOTION_STORAGE_KEY, motionLevel);
  }, [motionLevel]);

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.petals = petalsEnabled ? "true" : "false";
    window.localStorage.setItem(
      PETALS_STORAGE_KEY,
      petalsEnabled ? "true" : "false",
    );
  }, [petalsEnabled]);

  const toggleTheme = useCallback(() => {
    setThemeState((current) => (current === "dark" ? "light" : "dark"));
  }, []);

  const toggleThemeWithTransition = useCallback(
    (origin?: TransitionOrigin) => {
      const nextTheme: Theme = theme === "dark" ? "light" : "dark";
      const doc = document as ViewTransitionDocument;
      const reducedMotion =
        motionLevel === "off" ||
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      if (!doc.startViewTransition || reducedMotion) {
        setThemeState(nextTheme);
        return;
      }

      const x = origin?.x ?? window.innerWidth / 2;
      const y = origin?.y ?? 28;
      const endRadius = Math.hypot(
        Math.max(x, window.innerWidth - x),
        Math.max(y, window.innerHeight - y),
      );

      try {
        const transition = doc.startViewTransition(() => {
          applyThemeToDom(nextTheme);
          flushSync(() => {
            setThemeState(nextTheme);
          });
        });

        void transition.ready
          .then(() => {
            document.documentElement.animate(
              {
                clipPath: [
                  `circle(0px at ${x}px ${y}px)`,
                  `circle(${endRadius}px at ${x}px ${y}px)`,
                ],
              },
              {
                duration: motionLevel === "subtle" ? 360 : 520,
                easing: "cubic-bezier(0.22, 1, 0.36, 1)",
                pseudoElement: "::view-transition-new(root)",
              },
            );
          })
          .catch(() => {
            // Ignore aborted view transitions cleanly.
          });
      } catch {
        setThemeState(nextTheme);
      }
    },
    [motionLevel, theme],
  );

  const value = useMemo<ThemeContextValue>(
    () => ({
      accent,
      isDark: theme === "dark",
      motionLevel,
      petalsEnabled,
      setAccent: setAccentState,
      setMotionLevel: setMotionLevelState,
      setPetalsEnabled: setPetalsEnabledState,
      setTheme: setThemeState,
      theme,
      toggleTheme,
      toggleThemeWithTransition,
    }),
    [
      accent,
      motionLevel,
      petalsEnabled,
      theme,
      toggleTheme,
      toggleThemeWithTransition,
    ],
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
