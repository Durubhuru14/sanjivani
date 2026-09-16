import { createClient } from "@/lib/supabase/server";
import { supabaseEnvConfigured } from "@/lib/supabase/configured";
import { SuspenseSignOutButton } from "./sign-out-button";
import { SetupNotice } from "@/components/SetupNotice";
import { ShieldAlert } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function SuspendedPage() {
  if (!supabaseEnvConfigured()) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-4 py-16">
        <SetupNotice />
      </div>
    );
  }
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = user
    ? await supabase.from("profiles").select("name, role").eq("id", user.id).single()
    : { data: null };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-16">
      <Card className="w-full max-w-md text-center shadow-lift">
        <CardHeader className="items-center">
          <span className="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10 text-destructive">
            <ShieldAlert className="h-7 w-7" aria-hidden />
          </span>
          <CardTitle className="text-2xl">Your account has been suspended</CardTitle>
          <CardDescription className="text-base">
            {profile?.name ? `${profile.name}, an` : "An"} administrator has suspended this
            account.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm leading-relaxed text-muted-foreground">
            You are signed out of all areas of Sanjivani. Your campaigns, applications, and
            history are preserved — nothing has been deleted. If you believe this is a
            mistake, contact the platform administrator to review your account.
          </p>
          <SuspenseSignOutButton />
        </CardContent>
      </Card>
    </div>
  );
}
