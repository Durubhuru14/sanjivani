"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ChevronDown,
  Compass,
  LayoutDashboard,
  LogOut,
  Mail,
  Megaphone,
  Moon,
  Plus,
  Sun,
  UserRound,
  Users,
} from "lucide-react";
import type { ComponentType } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { UserAvatar } from "@/components/UserAvatar";
import type { Profile, Role } from "@/lib/types";

/**
 * Account menu — the single place for profile options. The avatar badge
 * opens everything about "me": profile settings, workspace shortcuts,
 * appearance, and sign out (the old navbar "Profile" link moved here).
 */
type QuickLink = { href: string; label: string; icon: ComponentType<{ className?: string }> };

const WORKSPACE_LINKS: Record<Role, QuickLink[]> = {
  admin: [],
  ngo: [
    { href: "/ngo/campaigns", label: "All campaigns", icon: Megaphone },
    { href: "/ngo/campaigns/new", label: "New campaign", icon: Plus },
    { href: "/ngo/staff", label: "Staff", icon: Users },
  ],
  volunteer: [
    { href: "/volunteer/browse", label: "Browse campaigns", icon: Compass },
    { href: "/volunteer/invites", label: "My invites", icon: Mail },
  ],
  staff: [],
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

export function UserMenu({ profile, email }: { profile: Profile; email?: string | null }) {
  const router = useRouter();
  const roleLabel =
    profile.role === "ngo" ? "NGO account" : profile.role === "admin" ? "Platform admin" : profile.role;

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const quickLinks = WORKSPACE_LINKS[profile.role] ?? [];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-10 gap-2.5 px-2 hover:bg-muted" aria-label="Account menu">
          <UserAvatar name={profile.name} src={profile.avatar_url} className="h-8 w-8 text-xs" />
          <span className="hidden max-w-32 truncate text-sm font-medium sm:block">
            {profile.name ?? profile.id.slice(0, 8)}
          </span>
          <ChevronDown className="hidden h-3.5 w-3.5 text-muted-foreground sm:block" aria-hidden />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64 animate-scale-in">
        {/* identity header */}
        <DropdownMenuLabel className="pb-3 pt-2.5">
          <span className="flex items-center gap-3">
            <UserAvatar name={profile.name} src={profile.avatar_url} className="h-11 w-11 text-sm" />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold text-foreground">
                {profile.name ?? "Unnamed member"}
              </span>
              {email ? (
                <span className="block truncate text-xs font-normal text-muted-foreground">{email}</span>
              ) : null}
              <span className="mt-1 inline-flex items-center gap-1.5 rounded-full border border-leaf/30 bg-tint px-2.5 py-0.5 text-[0.6875rem] font-semibold text-leaf-deep dark:text-leaf-bright">
                {roleLabel}
              </span>
            </span>
          </span>
        </DropdownMenuLabel>

        <DropdownMenuSeparator />

        {/* account */}
        <DropdownMenuItem asChild>
          <Link href={`/${profile.role}/profile`} className="cursor-pointer gap-2.5">
            <UserRound className="h-4 w-4" aria-hidden />
            Profile &amp; photo
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={toggleTheme} className="gap-2.5">
          <Sun className="hidden h-4 w-4 dark:block" aria-hidden />
          <Moon className="h-4 w-4 dark:hidden" aria-hidden />
          <span className="dark:hidden">Switch to dark mode</span>
          <span className="hidden dark:inline">Switch to light mode</span>
        </DropdownMenuItem>

        {/* workspace shortcuts */}
        {quickLinks.length > 0 ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="pb-1 pt-1.5 text-[0.6875rem] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
              Workspace
            </DropdownMenuLabel>
            {quickLinks.map((link) => (
              <DropdownMenuItem key={link.href} asChild>
                <Link href={link.href} className="cursor-pointer gap-2.5">
                  <link.icon className="h-4 w-4" aria-hidden />
                  {link.label}
                </Link>
              </DropdownMenuItem>
            ))}
          </>
        ) : null}

        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href={`/${profile.role}`} className="cursor-pointer gap-2.5">
            <LayoutDashboard className="h-4 w-4" aria-hidden />
            Dashboard
          </Link>
        </DropdownMenuItem>

        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={signOut}
          className="gap-2.5 text-destructive focus:text-destructive"
        >
          <LogOut className="h-4 w-4" aria-hidden /> Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function SignInLinks() {
  return (
    <div className="flex items-center gap-1 sm:gap-2">
      <Button variant="ghost" className="px-3 text-[13px] sm:px-4 sm:text-sm" asChild>
        <Link href="/login">Log in</Link>
      </Button>
      <Button className="px-3.5 text-[13px] sm:px-4 sm:text-sm" asChild>
        <Link href="/signup">Sign up</Link>
      </Button>
    </div>
  );
}
