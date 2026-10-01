import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { NgoProfileForm } from "./profile-form";
import { StatusBadge } from "@/components/StatusBadge";
import { StarsDisplay } from "@/components/StarsDisplay";
import type { Rating } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function NgoProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: ngo } = await supabase
    .from("ngos")
    .select("*")
    .eq("profile_id", user.id)
    .single();

  const { data: profile } = await supabase
    .from("profiles")
    .select("name, location")
    .eq("id", user.id)
    .single();

  const { data: ratings } = await supabase
    .from("ratings")
    .select("*, from_user:profiles!ratings_from_user_id_fkey(id, name)")
    .eq("to_user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(10);

  const ratingsList = (ratings ?? []) as unknown as Rating[];

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Organisation profile</h1>
        <p className="mt-1 text-muted-foreground">
          This is what volunteers see about your organisation.
        </p>
      </div>

      <Card className="shadow-soft">
        <CardHeader>
          <CardTitle>Verification</CardTitle>
          <CardDescription>
            Verification status: <StatusBadge status={ngo?.verification_status ?? "pending"} />
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-4">
            <StarsDisplay score={Number(ngo?.avg_rating ?? 0)} />
            <p className="text-sm text-muted-foreground">
              Average rating from volunteers across completed campaigns.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-soft">
        <CardHeader>
          <CardTitle>Details</CardTitle>
          <CardDescription>Editable at any time — even while approval is pending.</CardDescription>
        </CardHeader>
        <CardContent>
          <NgoProfileForm
            initial={{
              name: profile?.name ?? "",
              location: profile?.location ?? "",
              orgName: ngo?.org_name ?? "",
              registrationNumber: ngo?.registration_number ?? "",
              logoUrl: ngo?.logo_url ?? "",
            }}
          />
        </CardContent>
      </Card>

      <Card className="shadow-soft">
        <CardHeader>
          <CardTitle>Recent ratings received</CardTitle>
          <CardDescription>Feedback from volunteers on completed campaigns.</CardDescription>
        </CardHeader>
        <CardContent>
          {ratingsList.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No ratings yet — they appear after you complete campaigns with teams.
            </p>
          ) : (
            <ul className="space-y-3">
              {ratingsList.map((r) => (
                <li key={r.id} className="rounded-xl border p-4">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium">{r.from_user?.name ?? "Volunteer"}</p>
                    <StarsDisplay score={Number(r.score)} size="sm" />
                  </div>
                  {r.comment ? (
                    <p className="mt-1.5 text-sm text-muted-foreground">“{r.comment}”</p>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
