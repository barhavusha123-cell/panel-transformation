import { useCallback, useEffect, useState } from "react";

export type ThemeMode = "light" | "dark";
const THEME_KEY = "allnet_theme_v1";

function apply(mode: ThemeMode) {
  document.documentElement.classList.toggle("dark", mode === "dark");
  document.documentElement.style.colorScheme = mode;
}

export function useTheme() {
  const [theme, setThemeState] = useState<ThemeMode>("light");

  useEffect(() => {
    let stored = localStorage.getItem(THEME_KEY) as ThemeMode | null;
    if (stored !== "light" && stored !== "dark") {
      stored = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    }
    setThemeState(stored);
    apply(stored);
  }, []);

  const setTheme = useCallback((mode: ThemeMode) => {
    setThemeState(mode);
    apply(mode);
    try {
      localStorage.setItem(THEME_KEY, mode);
    } catch {
      /* ignore */
    }
  }, []);

  const toggle = useCallback(
    () => setTheme(document.documentElement.classList.contains("dark") ? "light" : "dark"),
    [setTheme],
  );

  return { theme, setTheme, toggle };
}
