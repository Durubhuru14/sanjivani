"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
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
import type { Profile } from "@/lib/types";

export function UserMenu({ profile }: { profile: Profile }) {
  const router = useRouter();

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-10 gap-2.5 px-2" aria-label="Account menu">
          <UserAvatar name={profile.name} src={profile.avatar_url} className="h-8 w-8 text-xs" />
          <span className="hidden max-w-32 truncate text-sm font-medium sm:block">
            {profile.name ?? profile.id.slice(0, 8)}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="flex flex-col">
          <span className="truncate">{profile.name}</span>
          <span className="text-xs font-normal capitalize text-muted-foreground">
            {profile.role === "ngo" ? "NGO account" : profile.role} account
          </span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={signOut} className="text-destructive focus:text-destructive">
          <LogOut className="h-4 w-4" aria-hidden /> Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function SignInLinks() {
  return (
    <div className="flex items-center gap-2">
      <Button variant="ghost" asChild>
        <a href="/login">Log in</a>
      </Button>
      <Button asChild>
        <a href="/signup">Sign up</a>
      </Button>
    </div>
  );
}

export function SuspendedSignOutButton() {
  const router = useRouter();
  return (
    <Button
      variant="outline"
      className="gap-2"
      onClick={async () => {
        const supabase = createClient();
        await supabase.auth.signOut();
        router.push("/login");
        router.refresh();
      }}
    >
      <LogOut className="h-4 w-4" aria-hidden /> Sign out
    </Button>
  );
}
