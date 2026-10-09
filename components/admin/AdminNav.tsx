"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const SECTIONS = [
  { href: "/admin", label: "Overview", exact: true },
  { href: "/admin/ngos", label: "NGOs" },
  { href: "/admin/campaigns", label: "Campaigns" },
  { href: "/admin/volunteers", label: "Volunteers" },
  { href: "/admin/staff", label: "Staff" },
  { href: "/admin/reports", label: "Reports" },
];

/** Admin section navigation — every oversight surface is one click away
 *  instead of being buried in tabs at the bottom of the dashboard. */
export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Admin sections" className="animate-fade-up">
      <ul className="flex items-center gap-1 overflow-x-auto rounded-xl border bg-muted/40 p-1">
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
