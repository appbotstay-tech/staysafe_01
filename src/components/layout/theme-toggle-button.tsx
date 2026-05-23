"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "bpma-theme";

type ThemeMode = "light" | "dark";

function applyTheme(theme: ThemeMode) {
  document.documentElement.classList.toggle("dark", theme === "dark");
}

function SunIcon() {
  return (
    <svg aria-hidden="true" className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="2" />
      <path
        d="M12 2v2.5M12 19.5V22M4.93 4.93 6.7 6.7M17.3 17.3l1.77 1.77M2 12h2.5M19.5 12H22M4.93 19.07 6.7 17.3M17.3 6.7l1.77-1.77"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="2"
      />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg aria-hidden="true" className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none">
      <path
        d="M20.5 14.6A8.3 8.3 0 0 1 9.4 3.5 8.7 8.7 0 1 0 20.5 14.6Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </svg>
  );
}

export function ThemeToggleButton({ compact = false }: { compact?: boolean }) {
  const [theme, setTheme] = useState<ThemeMode>("light");

  useEffect(() => {
    const savedTheme = window.localStorage.getItem(STORAGE_KEY);
    const fallbackTheme = document.documentElement.classList.contains("dark") ? "dark" : "light";
    const nextTheme =
      savedTheme === "dark" || savedTheme === "light" ? savedTheme : fallbackTheme;

    setTheme(nextTheme);
    applyTheme(nextTheme);
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    applyTheme(nextTheme);
    window.localStorage.setItem(STORAGE_KEY, nextTheme);
  };

  const nextLabel = theme === "dark" ? "Tema claro" : "Tema escuro";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={`btn-secondary gap-2 ${compact ? "w-full justify-start px-3" : ""}`}
      aria-label={nextLabel}
      title={nextLabel}
    >
      {theme === "dark" ? <SunIcon /> : <MoonIcon />}
      <span>{theme === "dark" ? "Claro" : "Escuro"}</span>
    </button>
  );
}
