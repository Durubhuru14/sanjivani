import { createClient } from "@/lib/supabase/server";
import { UserCheck } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ClaimInviteButton } from "./claim-button";

export const dynamic = "force-dynamic";

/**
 * Claim a staff invite (spec §4/§5).
 * Reachable by logged-in users whose email matches a pending ngo_staff row —
 * the middleware allows any role on this path. Fresh signups with the invited
 * email are claimed automatically at signup.
 */
export default async function AcceptInvitePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: me } = await supabase
    .from("profiles")
    .select("id, name, role")
    .eq("id", user.id)
    .single();

  const { data: { user: authUser } } = await supabase.auth.getUser();
  const email = authUser?.email;

  let invite: { ngo_name: string; invited_name: string | null } | null = null;
  if (email) {
    // find my pending invite via the service role (ngo_staff rows are
    // readable by invitee email match, but this page must also work
    // before the claim, so go through the email-match RLS policy)
    const { data } = await supabase
      .from("ngo_staff")
      .select("invited_name, ngo:ngos!ngo_staff_ngo_id_fkey(org_name)")
      .ilike("invited_email", email)
      .is("profile_id", null)
      .eq("status", "invited")
      .limit(1)
      .maybeSingle();
    if (data) {
      const row = data as { invited_name: string | null; ngo: { org_name: string } | { org_name: string }[] | null };
      invite = {
        ngo_name: Array.isArray(row.ngo) ? row.ngo[0]?.org_name ?? "an NGO" : row.ngo?.org_name ?? "an NGO",
        invited_name: row.invited_name,
      };
    }
  }

  if (me?.role === "staff") {
    return (
      <div className="mx-auto max-w-lg">
        <Card className="text-center shadow-soft">
          <CardHeader className="items-center">
            <span className="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-sm border border-patina/35 bg-patina/12 text-patina">
              <UserCheck className="h-7 w-7" aria-hidden />
            </span>
            <CardTitle className="text-2xl">You are already staff</CardTitle>
            <CardDescription>Your account is active. Head to your dashboard.</CardDescription>
          </CardHeader>
          <CardContent>
            <ClaimInviteButton />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg">
      <Card className="shadow-soft">
        <CardHeader className="items-center text-center">
          <span className="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
            <UserCheck className="h-7 w-7" aria-hidden />
          </span>
          <CardTitle className="text-2xl">Staff invitation</CardTitle>
          <CardDescription>
            {invite
              ? `${invite.ngo_name} invited ${invite.invited_name ?? "you"} to join as staff.`
              : "No pending staff invite found for your email."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm leading-relaxed text-muted-foreground">
            Accepting switches this account to a staff role scoped to the inviting NGO.
            You keep your name and photo; if you also volunteer elsewhere you will no
            longer see the volunteer area.
          </p>
          {invite ? (
            <ClaimInviteButton />
          ) : (
            <p className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
              Ask your NGO to invite your email ({email ?? "your account email"}) from their
              Staff page, then return here.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
