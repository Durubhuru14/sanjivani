"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { LayoutDashboard, Building2, Megaphone, HeartHandshake, UserSquare2, Flag } from "lucide-react";
import { cn } from "@/lib/utils";

const SECTIONS = [
  { href: "/admin", label: "Overview", exact: true, icon: LayoutDashboard },
  { href: "/admin/ngos", label: "NGOs", icon: Building2 },
  { href: "/admin/campaigns", label: "Campaigns", icon: Megaphone },
  { href: "/admin/volunteers", label: "Volunteers", icon: HeartHandshake },
  { href: "/admin/staff", label: "Staff", icon: UserSquare2 },
  { href: "/admin/reports", label: "Reports", icon: Flag },
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
        className="flex items-center gap-1 overflow-x-auto rounded-full border bg-muted/40 p-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {SECTIONS.map((s) => {
          const active = s.exact ? pathname === s.href : pathname.startsWith(s.href);
          return (
            <li key={s.href}>
              <Link
                href={s.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "inline-flex h-8 items-center gap-1.5 whitespace-nowrap rounded-full px-3 text-sm font-medium transition-all duration-200",
                  active
                    ? "bg-primary text-primary-foreground shadow-btn"
                    : "text-muted-foreground hover:bg-card hover:text-foreground"
                )}
              >
                <s.icon className={cn("h-3.5 w-3.5", active ? "opacity-90" : "opacity-70")} aria-hidden />
                {s.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
