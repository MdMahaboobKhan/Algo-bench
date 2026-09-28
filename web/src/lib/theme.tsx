"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "theme";

/**
 * Inlined into <head> as a blocking script so the `dark` class is applied to
 * <html> before first paint (avoids a light->dark flash and the React
 * hydration mismatch that a useEffect-only approach would cause).
 */
export const THEME_INIT_SCRIPT = `
(function () {
  try {
    var stored = localStorage.getItem("${STORAGE_KEY}");
    var dark = stored ? stored === "dark" : window.matchMedia("(prefers-color-scheme: dark)").matches;
    document.documentElement.classList.toggle("dark", dark);
  } catch (e) {}
})();
`;

function isDark(): boolean {
  if (typeof document === "undefined") return false;
  return document.documentElement.classList.contains("dark");
}

/**
 * Tracks the current `dark` class on <html>, updating on toggle.
 *
 * Initial state is always `false` (not a lazy `isDark()` read) even though
 * the blocking init script may have already set the real class before this
 * component hydrates -- reading the live DOM here would make the client's
 * first render diverge from the server-rendered ("no DOM, always false")
 * output and trigger a hydration text mismatch on anything that renders
 * differently per-theme (e.g. the toggle button's label). The correction
 * happens a tick later in the effect below, which is a normal post-hydration
 * update, not part of hydration reconciliation.
 */
export function useIsDarkMode(): boolean {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    setDark(isDark());
    const observer = new MutationObserver(() => setDark(isDark()));
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  return dark;
}

export function ThemeToggle() {
  const dark = useIsDarkMode();

  function toggle() {
    const next = !document.documentElement.classList.contains("dark");
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem(STORAGE_KEY, next ? "dark" : "light");
  }

  return (
    <button
      onClick={toggle}
      aria-label="Toggle dark mode"
      className="rounded-md border border-zinc-200 dark:border-zinc-700 px-2.5 py-1.5 text-sm text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
    >
      {dark ? "☀️ Light" : "🌙 Dark"}
    </button>
  );
}
