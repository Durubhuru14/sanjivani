"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

const SECTIONS = [
  { href: "/admin", label: "Overview", exact: true },
  { href: "/admin/ngos", label: "NGOs" },
  { href: "/admin/campaigns", label: "Campaigns" },
  { href: "/admin/volunteers", label: "Volunteers" },
  { href: "/admin/staff", label: "Staff" },
  { href: "/admin/reports", label: "Reports" },
];

/**
 * Admin section navigation — every oversight surface is one click away
 * instead of being buried in tabs at the bottom of the dashboard.
 *
 * The pill bar scrolls horizontally when the viewport is too narrow (the six
 * sections never fit below ~500px). Edge fade masks (toggled by scroll state)
 * signal the overflow in both directions — a partially faded pill reads as
 * "keep scrolling", where a hard-clipped one reads as broken.
 */
export function AdminNav() {
  const pathname = usePathname();
  const listRef = useRef<HTMLUListElement>(null);
  const [fadeStart, setFadeStart] = useState(false);
  const [fadeEnd, setFadeEnd] = useState(false);

  function updateFades() {
    const el = listRef.current;
    if (!el) return;
    setFadeStart(el.scrollLeft > 4);
    setFadeEnd(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }

  useEffect(() => {
    updateFades();
    // sections never change at runtime; one layout pass is enough — but
    // re-check after fonts settle so the mask never lies
    const t = setTimeout(updateFades, 300);
    return () => clearTimeout(t);
  }, []);

  const mask =
    fadeStart && fadeEnd
      ? "linear-gradient(to right, transparent, black 18px, black calc(100% - 18px), transparent)"
      : fadeStart
        ? "linear-gradient(to right, transparent, black 18px)"
        : fadeEnd
          ? "linear-gradient(to right, black calc(100% - 18px), transparent)"
          : undefined;

  return (
    <nav aria-label="Admin sections" className="animate-fade-up">
      <ul
        ref={listRef}
        onScroll={updateFades}
        style={mask ? { maskImage: mask, WebkitMaskImage: mask } : undefined}
        className="flex items-center gap-1 overflow-x-auto rounded-xl border bg-muted/40 p-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {SECTIONS.map((s) => {
          const active = s.exact ? pathname === s.href : pathname.startsWith(s.href);
          return (
            <li key={s.href}>
              <Link
                href={s.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "inline-flex h-8 items-center whitespace-nowrap rounded-lg px-3 text-sm font-medium transition-colors",
                  active
                    ? "bg-card text-foreground shadow-soft"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {s.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
