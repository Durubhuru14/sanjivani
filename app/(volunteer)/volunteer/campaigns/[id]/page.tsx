import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { CalendarDays, Clock, MapPin, Target, Users, Wallet } from "lucide-react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { StarsDisplay } from "@/components/StarsDisplay";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ApplyButton, RespondInviteButtons } from "./campaign-actions";
import { RatingForm } from "@/components/ratings/RatingForm";
import { canRate as canRateCheck } from "@/lib/ratings";
import { formatMoney } from "@/lib/funds";
import { formatDate, initials } from "@/lib/format";
import type {
  Campaign,
  FundAllocation,
  Profile,
  Rating,
} from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function VolunteerCampaignDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: campaignRow } = await supabase
    .from("campaigns")
    .select(
      "*, ngo:ngos!campaigns_ngo_id_fkey(profile_id, org_name, verification_status, avg_rating, logo_url, registration_number, profile:profiles!ngos_profile_id_fkey(suspended))"
    )
    .eq("id", id)
    .limit(1)
    .maybeSingle();
  const campaign = campaignRow as
    | (Campaign & { ngo?: { verification_status?: string; profile?: { suspended?: boolean } | null } })
    | null;
  if (!campaign) notFound();

  const [appRes, inviteRes, teamRes, fundsRes, ratingsToMeRes, myRatingRes] = await Promise.all([
    supabase
      .from("applications")
      .select("id, status")
      .eq("volunteer_id", user.id)
      .eq("campaign_id", id)
      .limit(1)
      .maybeSingle(),
    supabase
      .from("campaign_invites")
      .select("id, status")
      .eq("volunteer_id", user.id)
      .eq("campaign_id", id)
      .limit(1)
      .maybeSingle(),
    supabase
      .from("team_members")
      .select(
        "id, member_type, hours_logged, profile:profiles!team_members_user_id_fkey(id, name, avatar_url, role)"
      )
      .in(
        "team_id",
        (await supabase.from("teams").select("id").eq("campaign_id", id)).data?.map((t) => t.id) ??
          ["00000000-0000-0000-0000-000000000000"]
      ),
    supabase
      .from("fund_allocations")
      .select("id, amount, status, note, profile:profiles!fund_allocations_member_id_fkey(name)")
      .eq("campaign_id", id)
      .eq("member_id", user.id),
    supabase
      .from("ratings")
      .select("id, score, comment, from_user:profiles!ratings_from_user_id_fkey(name)")
      .eq("campaign_id", id)
      .eq("to_user_id", user.id),
    supabase
      .from("ratings")
      .select("id, score, comment")
      .eq("campaign_id", id)
      .eq("from_user_id", user.id)
      .eq("to_user_id", campaign.ngo_id)
      .limit(1)
      .maybeSingle(),
  ]);

  const myApplication = appRes.data;
  const myInvite = inviteRes.data;
  const teamMembers = (teamRes.data ?? []) as unknown as Array<{
    id: string;
    member_type: string;
    hours_logged: number;
    profile: Profile | null;
  }>;
  const onTeam = teamMembers.some((m) => m.profile?.id === user.id);
  const myFunds = (fundsRes.data ?? []) as unknown as FundAllocation[];
  const myRatingFromNgo = ratingsToMeRes.data as Rating | null;
  const myRatingToNgo = myRatingRes.data as Rating | null;

  // A suspended NGO's operation is taken down from public view — only people
  // already on the team keep access to their own history on it.
  const ownerTakenDown =
    campaign.ngo?.verification_status !== "approved" || Boolean(campaign.ngo?.profile?.suspended);
  if (ownerTakenDown && !onTeam) notFound();

  const joinable =
    (campaign.status === "upcoming" || campaign.status === "ongoing") && campaign.type === "public";
  const completed = campaign.status === "completed";

  const ratingDecision = canRateCheck({
    campaignStatus: campaign.status,
    raterOnTeam: onTeam,
    rateeOnTeam: true, // the NGO owns the campaign
    raterId: user.id,
    rateeId: campaign.ngo_id,
    alreadyRated: Boolean(myRatingToNgo),
  });

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader
        backHref="/volunteer/browse"
        backLabel="Back to browse"
        title={campaign.title}
        subtitle={
          <span className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
            <StatusBadge status={campaign.status} />
            <StatusBadge status={campaign.type === "invite" ? "invite" : "public"} />
            {campaign.location ? (
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-4 w-4" aria-hidden /> {campaign.location}
              </span>
            ) : null}
            <span className="inline-flex items-center gap-1">
              <CalendarDays className="h-4 w-4" aria-hidden />
              {formatDate(campaign.start_date)} – {formatDate(campaign.end_date)}
            </span>
          </span>
        }
      />

      {/* Campaign banner */}
      <div className="overflow-hidden rounded-md border bg-card">
        {campaign.image_url ? (
          <img src={campaign.image_url} alt={campaign.title} className="h-48 w-full object-cover sm:h-64" />
        ) : (
          <div className="flex h-32 w-full items-center justify-center bg-tint/70 sm:h-44" aria-hidden>
            <span className="text-5xl font-black tracking-tighter text-primary/25">
              {campaign.title.slice(0, 2).toUpperCase()}
            </span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card className="shadow-soft">
            <CardHeader>
              <CardTitle>About this campaign</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {campaign.description ? (
                <p className="leading-relaxed text-muted-foreground">{campaign.description}</p>
              ) : (
                <p className="text-sm text-muted-foreground">No description provided.</p>
              )}
              {campaign.objectives ? (
                <div>
                  <p className="mb-2 flex items-center gap-1.5 font-semibold">
                    <Target className="h-4 w-4 text-primary" aria-hidden /> Objectives
                  </p>
                  <p className="whitespace-pre-line leading-relaxed text-muted-foreground">
                    {campaign.objectives}
                  </p>
                </div>
              ) : null}
            </CardContent>
          </Card>

          {onTeam ? (
            <Card className="shadow-soft">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" aria-hidden /> The team
                </CardTitle>
                <CardDescription>People you are working with.</CardDescription>
              </CardHeader>
              <CardContent>
                {teamMembers.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Team is being formed.</p>
                ) : (
                  <ul className="grid auto-rows-fr grid-cols-1 gap-2 sm:grid-cols-2">
                    {teamMembers.map((m) => (
                      <li key={m.id} className="flex h-full min-h-16 items-center gap-3 rounded-xl border p-3">
                        <Avatar className="h-9 w-9 border">
                          {m.profile?.avatar_url ? (
                            <AvatarImage src={m.profile.avatar_url} alt={m.profile?.name ?? "member"} />
                          ) : null}
                          <AvatarFallback className="bg-primary/10 text-xs font-bold text-primary">
                            {initials(m.profile?.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="row-body">
                          <p className="truncate font-medium">{m.profile?.name ?? "Member"}</p>
                          <Badge variant="outline" className="font-normal capitalize">
                            {m.member_type}
                          </Badge>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          ) : null}

          {onTeam ? (
            <Card className="shadow-soft">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Wallet className="h-5 w-5 text-primary" aria-hidden /> Funds allocated to me
                </CardTitle>
                <CardDescription>
                  Fund data is visible only to accepted team members.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {myFunds.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No allocations recorded for you on this campaign yet.
                  </p>
                ) : (
                  <ul className="divide-y rounded-xl border">
                    {myFunds.map((f) => (
                      <li key={f.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                        <p className="shrink-0 font-semibold tabular-nums">{formatMoney(Number(f.amount))}</p>
                        {f.note ? (
                          <p className="row-body truncate text-sm text-muted-foreground">
                            {f.note}
                          </p>
                        ) : (
                          <span className="row-body" aria-hidden />
                        )}
                        <StatusBadge status={f.status} />
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          ) : null}

          {completed && onTeam ? (
            <RatingForm
              campaignId={id}
              rateeId={campaign.ngo_id}
              rateeName={campaign.ngo?.org_name ?? "the NGO"}
              myRating={(myRatingToNgo) ?? null}
              canRate={ratingDecision.allowed}
              reason={ratingDecision.reason}
            />
          ) : null}

          {completed && onTeam && myRatingFromNgo ? (
            <Card className="shadow-soft">
              <CardHeader>
                <CardTitle>Rating you received from the NGO</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <StarsDisplay score={Number(myRatingFromNgo.score)} />
                {myRatingFromNgo.comment ? (
                  <p className="rounded-lg bg-muted p-3 text-sm text-muted-foreground">
                    “{myRatingFromNgo.comment}”
                  </p>
                ) : null}
              </CardContent>
            </Card>
          ) : null}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card className="shadow-soft">
            <CardHeader>
              <CardTitle>Organised by</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-3">
                <Avatar className="h-12 w-12 border">
                  {campaign.ngo?.logo_url ? (
                    <AvatarImage src={campaign.ngo.logo_url} alt={campaign.ngo?.org_name ?? "NGO"} />
                  ) : null}
                  <AvatarFallback className="bg-primary/10 font-bold text-primary">
                    {initials(campaign.ngo?.org_name)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="truncate font-semibold">{campaign.ngo?.org_name}</p>
                  {campaign.ngo?.verification_status === "approved" ? (
                    <VerifiedBadge verified label="Verified NGO" />
                  ) : null}
                </div>
              </div>
              {Number(campaign.ngo?.avg_rating ?? 0) > 0 ? (
                <StarsDisplay score={Number(campaign.ngo?.avg_rating ?? 0)} />
              ) : null}
              <p className="text-xs text-muted-foreground">
                Registration: {campaign.ngo?.registration_number ?? "—"}
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-soft">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-primary" aria-hidden /> Your status
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {onTeam ? (
                <div className="space-y-2">
                  <StatusBadge status="accepted" />
                  <p className="text-sm text-muted-foreground">
                    You are on the team — chat rooms you were added to appear on your dashboard.
                  </p>
                </div>
              ) : myInvite ? (
                myInvite.status === "pending" ? (
                  <div className="space-y-3">
                    <p className="text-sm text-muted-foreground">
                      You have a personal invitation to this campaign.
                    </p>
                    <RespondInviteButtons campaignId={id} inviteId={myInvite.id} />
                  </div>
                ) : (
                  <div className="space-y-2">
                    <StatusBadge status={myInvite.status} />
                    <p className="text-sm text-muted-foreground">
                      You {myInvite.status} this invitation.
                    </p>
                  </div>
                )
              ) : myApplication ? (
                <div className="space-y-2">
                  <StatusBadge status={myApplication.status} />
                  <p className="text-sm text-muted-foreground">
                    {myApplication.status === "pending"
                      ? "The NGO is reviewing your application — you will be notified."
                      : myApplication.status === "accepted"
                        ? "You are accepted! The NGO will add you to a team next — you will be notified when that happens."
                        : "This application was declined."}
                  </p>
                  {myApplication.status === "rejected" && joinable ? (
                    <div className="space-y-3 pt-1">
                      <p className="text-sm text-muted-foreground">
                        You can apply again, or browse other campaigns.
                      </p>
                      <ApplyButton campaignId={id} />
                    </div>
                  ) : null}
                </div>
              ) : joinable ? (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Applications are open — tell the NGO why you would like to join.
                  </p>
                  <ApplyButton campaignId={id} />
                </div>
              ) : campaign.type === "invite" ? (
                <p className="text-sm text-muted-foreground">
                  This is an invite-only campaign. It is visible to you because you were
                  invited.
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">
                  This campaign is {campaign.status} and is not accepting new applications.
                </p>
              )}
            </CardContent>
            <CardFooter>
              <Button asChild variant="outline" className="w-full">
                <Link href="/volunteer/browse">Back to browse</Link>
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
}
