"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, Moon, Sun, UserRound } from "lucide-react";
import { Logo } from "@/components/Logo";
import { NotificationsBell } from "@/components/notifications/NotificationsBell";
import { UserMenu } from "@/components/UserMenu";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { demoActive } from "@/lib/demo/flag";
import { cn } from "@/lib/utils";
import type { Profile } from "@/lib/types";

/**
 * Profile settings live in the avatar badge's account menu (UserMenu) —
 * the navbar itself stays task-focused.
 */
const NAV_LINKS: Record<string, Array<{ href: string; label: string }>> = {
  admin: [
    { href: "/admin", label: "Dashboard" },
  ],
  ngo: [
    { href: "/ngo", label: "Dashboard" },
    { href: "/ngo/campaigns", label: "Campaigns" },
    { href: "/ngo/staff", label: "Staff" },
  ],
  staff: [
    { href: "/staff", label: "Dashboard" },
  ],
  volunteer: [
    { href: "/volunteer", label: "Dashboard" },
    { href: "/volunteer/browse", label: "Browse" },
    { href: "/volunteer/invites", label: "My invites" },
  ],
};

function toggleTheme() {
  const root = document.documentElement;
  const next = !root.classList.contains("dark");
  root.classList.toggle("dark", next);
  try {
    localStorage.setItem("theme", next ? "dark" : "light");
  } catch {
    /* private mode — session-only theme is fine */
  }
}

export function AppNavbar({ profile, email }: { profile: Profile; email?: string | null }) {
  const pathname = usePathname();
  const links = NAV_LINKS[profile.role] ?? [];

  function isActive(href: string) {
    if (href.split("/").filter(Boolean).length === 1) return pathname === href;
    return pathname.startsWith(href);
  }

  return (
    <header className="sticky top-0 z-40 animate-fade-in border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/75">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6 lg:px-8">
        <Link
          href={`/${profile.role === "ngo" ? "ngo" : profile.role}`}
          aria-label="Sanjivani home"
          className="press shrink-0 rounded-md"
        >
          <Logo compact />
        </Link>

        {demoActive ? (
          <span className="hidden items-center gap-1.5 rounded-full border border-leaf/35 bg-tint px-2.5 py-0.5 font-mono text-[0.625rem] font-medium uppercase tracking-[0.14em] text-leaf sm:inline-flex">
            <span className="animate-pulse-dot h-1 w-1 rounded-full bg-current text-leaf" aria-hidden />
            Demo · seeded data
          </span>
        ) : null}

        {/* Desktop nav */}
        <nav className="ml-4 hidden items-center gap-1 md:flex" aria-label="Main">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "rounded-md px-3 py-2 text-sm font-medium transition-all duration-200 active:scale-[0.97]",
                isActive(link.href)
                  ? "bg-tint text-leaf"
                  : "text-muted-foreground hover:-translate-y-px hover:bg-muted hover:text-foreground"
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-1.5">
          <NotificationsBell />
          <UserMenu profile={profile} email={email} />

          {/* Mobile nav */}
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden" aria-label="Open menu">
                <Menu className="h-5 w-5" aria-hidden />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-64 bg-card">
              <SheetTitle className="sr-only">Navigation</SheetTitle>
              <nav className="mt-2 flex flex-col gap-1" aria-label="Mobile">
                {links.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={cn(
                      "rounded-md px-3 py-2.5 text-sm font-medium",
                      isActive(link.href)
                        ? "bg-tint text-leaf"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    {link.label}
                  </Link>
                ))}
              </nav>
              <div className="mt-4 space-y-1 border-t border-border pt-4">
                <Link
                  href={`/${profile.role}/profile`}
                  className="flex items-center gap-2.5 rounded-md px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  <UserRound className="h-4 w-4" aria-hidden /> Profile
                </Link>
                <button
                  type="button"
                  onClick={toggleTheme}
                  className="flex w-full items-center gap-2.5 rounded-md px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  <Sun className="hidden h-4 w-4 dark:block" aria-hidden />
                  <Moon className="h-4 w-4 dark:hidden" aria-hidden />
                  <span className="dark:hidden">Dark mode</span>
                  <span className="hidden dark:inline">Light mode</span>
                </button>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
