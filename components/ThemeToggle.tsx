"use client";

import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Theme toggle (Sanjivani_Spec.md §3):
 * single `theme` key in localStorage, `dark` class on <html>,
 * defaulting to system preference via prefers-color-scheme.
 * The no-flash bootstrap script lives in app/layout.tsx.
 *
 * The icon reflects the current theme purely via CSS (dark: variants),
 * so there is no state to hydrate and no flash.
 */
export function ThemeToggle({ className }: { className?: string }) {
  function toggle() {
    const root = document.documentElement;
    const next = !root.classList.contains("dark");
    root.classList.toggle("dark", next);
    try {
      localStorage.setItem("theme", next ? "dark" : "light");
    } catch {
      /* private mode — session-only theme is fine */
    }
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggle}
      className={className}
      aria-label="Toggle dark / light mode"
      title="Toggle dark / light mode"
    >
      <Sun className="hidden h-4 w-4 dark:block" aria-hidden />
      <Moon className="h-4 w-4 dark:hidden" aria-hidden />
    </Button>
  );
}
