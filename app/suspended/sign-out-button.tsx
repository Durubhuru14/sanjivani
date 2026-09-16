"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

export function SuspenseSignOutButton() {
  const router = useRouter();
  return (
    <Button
      variant="outline"
      className="w-full gap-2"
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
