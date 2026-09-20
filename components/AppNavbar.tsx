"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { Logo } from "@/components/Logo";
import { NotificationsBell } from "@/components/notifications/NotificationsBell";
import { UserMenu } from "@/components/UserMenu";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import type { Profile } from "@/lib/types";

const NAV_LINKS: Record<string, Array<{ href: string; label: string }>> = {
  admin: [
    { href: "/admin", label: "Dashboard" },
  ],
  ngo: [
    { href: "/ngo", label: "Dashboard" },
    { href: "/ngo/campaigns", label: "Campaigns" },
    { href: "/ngo/staff", label: "Staff" },
    { href: "/ngo/profile", label: "Profile" },
  ],
  staff: [
    { href: "/staff", label: "Dashboard" },
    { href: "/staff/profile", label: "Profile" },
  ],
  volunteer: [
    { href: "/volunteer", label: "Dashboard" },
    { href: "/volunteer/browse", label: "Browse" },
    { href: "/volunteer/invites", label: "My invites" },
    { href: "/volunteer/profile", label: "Profile" },
  ],
};

export function AppNavbar({ profile }: { profile: Profile }) {
  const pathname = usePathname();
  const links = NAV_LINKS[profile.role] ?? [];

  function isActive(href: string) {
    if (href.split("/").filter(Boolean).length === 1) return pathname === href;
    return pathname.startsWith(href);
  }

  return (
    <header className="sticky top-0 z-40 border-b bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/75">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6 lg:px-8">
        <Link href={`/${profile.role === "ngo" ? "ngo" : profile.role}`} aria-label="Sanjivani home" className="shrink-0">
          <Logo compact />
        </Link>

        {/* Desktop nav */}
        <nav className="ml-4 hidden items-center gap-1 md:flex" aria-label="Main">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive(link.href)
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-1.5">
          <NotificationsBell />
          <UserMenu profile={profile} />

          {/* Mobile nav */}
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden" aria-label="Open menu">
                <Menu className="h-5 w-5" aria-hidden />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-64">
              <SheetTitle className="sr-only">Navigation</SheetTitle>
              <nav className="mt-2 flex flex-col gap-1" aria-label="Mobile">
                {links.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={cn(
                      "rounded-lg px-3 py-2.5 text-sm font-medium",
                      isActive(link.href)
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    {link.label}
                  </Link>
                ))}
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
