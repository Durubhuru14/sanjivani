import { createClient } from "@/lib/supabase/server";
import { Star } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/EmptyState";
import { PageHeader } from "@/components/PageHeader";
import { NgoProfileForm } from "./profile-form";
import { StatusBadge } from "@/components/StatusBadge";
import { StarsDisplay } from "@/components/StarsDisplay";
import { UserAvatar } from "@/components/UserAvatar";
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
    .select("name, location, avatar_url")
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
      <PageHeader
        backHref="/ngo"
        backLabel="Dashboard"
        title="Organisation profile"
        subtitle="This is what volunteers see about your organisation."
      />

      <div className="flex flex-wrap items-center gap-4">
        <UserAvatar
          name={ngo?.org_name ?? profile?.name}
          src={ngo?.logo_url ?? profile?.avatar_url}
          className="h-16 w-16 rounded-lg text-lg"
          rounded="lg"
        />
        <div className="min-w-0">
          <p className="truncate font-semibold">{ngo?.org_name ?? profile?.name ?? "Your organisation"}</p>
          <p className="truncate text-sm text-muted-foreground">
            {profile?.location || "location not set"}
          </p>
        </div>
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
            <EmptyState
              icon={Star}
              title="No ratings yet"
              hint="Ratings appear here after you complete campaigns with teams."
            />
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
