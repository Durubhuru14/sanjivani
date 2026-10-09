import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CalendarDays, MapPin, Star, Users } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmptyState } from "@/components/EmptyState";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { StarsDisplay } from "@/components/StarsDisplay";
import { UserAvatar } from "@/components/UserAvatar";
import { CampaignForm } from "@/components/campaigns/CampaignForm";
import { CampaignStatusActions } from "@/components/campaigns/CampaignStatusActions";
import { ApplicationsPanel } from "@/components/campaigns/ApplicationsPanel";
import { TeamPanel, type AssignablePerson } from "@/components/campaigns/TeamPanel";
import { InviteVolunteersPanel } from "@/components/campaigns/InviteVolunteersPanel";
import { ReportVolunteerDialog } from "@/components/campaigns/ReportVolunteerDialog";
import { FundLedger } from "@/components/funds/FundLedger";
import { RatingForm } from "@/components/ratings/RatingForm";
import { updateCampaign } from "@/app/(ngo)/ngo/actions";
import { formatDate } from "@/lib/format";
import { formatMoney } from "@/lib/funds";
import type {
  Application,
  Campaign,
  CampaignInvite,
  FundAllocation,
  NgoStaff,
  Rating,
  Team,
} from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function ManageCampaignPage({
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
    .select("*")
    .eq("id", id)
    .limit(1)
    .maybeSingle();
  const campaign = campaignRow as Campaign | null;
  if (!campaign || campaign.ngo_id !== user.id) notFound();

  const [
    teamsRes,
    applicationsRes,
    invitesRes,
    fundsRes,
    staffRes,
    ratingsRes,
    myRatingToVolunteersRes,
  ] = await Promise.all([
    supabase
      .from("teams")
      .select("*, members:team_members(*, profile:profiles!team_members_user_id_fkey(id, name, avatar_url, role))")
      .eq("campaign_id", id),
    supabase
      .from("applications")
      .select(
        "*, volunteer:volunteer_id(id, name, avatar_url, volunteers(profile_id, skills, availability, avg_rating, verification_status))"
      )
      .eq("campaign_id", id)
      .order("created_at", { ascending: false }),
    supabase
      .from("campaign_invites")
      .select(
        "*, volunteer:volunteer_id(id, name, avatar_url, volunteers(profile_id, skills))"
      )
      .eq("campaign_id", id)
      .order("created_at", { ascending: false }),
    supabase
      .from("fund_allocations")
      .select("*, profile:profiles!fund_allocations_member_id_fkey(id, name)")
      .eq("campaign_id", id)
      .order("created_at", { ascending: true }),
    supabase
      .from("ngo_staff")
      .select("profile_id, invited_name, invited_email, status, profile:profiles!ngo_staff_profile_id_fkey(id, name)")
      .eq("ngo_id", user.id)
      .eq("status", "active"),
    supabase
      .from("ratings")
      .select("*, from_user:profiles!ratings_from_user_id_fkey(id, name), to_user:profiles!ratings_to_user_id_fkey(id, name)")
      .eq("campaign_id", id)
      .order("created_at", { ascending: false }),
    supabase.from("ratings").select("to_user_id").eq("campaign_id", id).eq("from_user_id", user.id),
  ]);

  const teams = (teamsRes.data ?? []) as unknown as Team[];
  const applications = (applicationsRes.data ?? []) as unknown as Application[];
  const invites = (invitesRes.data ?? []) as unknown as CampaignInvite[];
  const funds = (fundsRes.data ?? []) as unknown as FundAllocation[];
  const activeStaff = (staffRes.data ?? []) as unknown as NgoStaff[];
  const ratings = (ratingsRes.data ?? []) as unknown as Rating[];
  const ratedByMe = new Set((myRatingToVolunteersRes.data ?? []).map((r) => r.to_user_id as string));

  const teamMembers = teams.flatMap((t) => t.members ?? []);
  const memberUserIds = new Set(teamMembers.map((m) => m.user_id));
  const acceptedVolunteers = applications
    .filter((a) => a.status === "accepted" && !memberUserIds.has(a.volunteer_id))
    .map((a) => ({
      userId: a.volunteer_id,
      name: a.volunteer?.name ?? "Volunteer",
      memberType: "volunteer" as const,
    }));
  const assignableStaff = activeStaff
    .filter((s) => s.profile_id && !memberUserIds.has(s.profile_id))
    .map((s) => ({
      userId: s.profile_id!,
      name: s.profile?.name ?? s.invited_name ?? s.invited_email,
      memberType: "staff" as const,
    }));
  const assignable: AssignablePerson[] = [...assignableStaff, ...acceptedVolunteers];

  const completed = campaign.status === "completed";
  const terminal = completed || campaign.status === "cancelled";
  const pendingApplications = applications.filter((a) => a.status === "pending").length;
  const reportableVolunteers = teamMembers.filter((m) => m.member_type === "volunteer");

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* header */}
      <PageHeader
        backHref="/ngo/campaigns"
        backLabel="Back to campaigns"
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
            <span>
              Budget {formatMoney(Number(campaign.total_budget))} · {formatMoney(Number(campaign.remaining_budget))} left
            </span>
          </span>
        }
      />

      {/* status toolbar — primary action left, secondary + destructive right */}
      <CampaignStatusActions campaign={campaign} />

      <Tabs defaultValue="team">
        <TabsList className="h-auto w-full flex-wrap sm:h-9 sm:w-fit">
          <TabsTrigger value="team">Team &amp; hours</TabsTrigger>
          <TabsTrigger value="applications">
            Applications{pendingApplications > 0 ? ` (${pendingApplications})` : ""}
          </TabsTrigger>
          {campaign.type === "invite" ? <TabsTrigger value="invites">Invite volunteers</TabsTrigger> : null}
          <TabsTrigger value="funds">Funds</TabsTrigger>
          {completed ? <TabsTrigger value="ratings">Ratings</TabsTrigger> : null}
          <TabsTrigger value="edit">Edit</TabsTrigger>
        </TabsList>

        <TabsContent value="team" className="mt-4 space-y-6">
          <Card className="shadow-soft">
            <CardHeader>
              <CardTitle>Campaign team</CardTitle>
              <CardDescription>
                Add accepted volunteers and active staff to teams.{" "}
                {completed
                  ? "The campaign is completed — you can now log hours for each member."
                  : "Hours logging unlocks when the campaign is completed."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <TeamPanel
                campaignId={id}
                teams={teams}
                assignable={assignable}
                campaignCompleted={completed}
                changesLocked={terminal}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="applications" className="mt-4 space-y-6">
          <Card className="shadow-soft">
            <CardHeader>
              <CardTitle>Volunteer applications</CardTitle>
              <CardDescription>
                Accepted volunteers become assignable to the campaign team.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ApplicationsPanel applications={applications} campaignStatus={campaign.status} />
            </CardContent>
          </Card>
        </TabsContent>

        {campaign.type === "invite" ? (
          <TabsContent value="invites" className="mt-4 space-y-6">
            <Card className="shadow-soft">
              <CardHeader>
                <CardTitle>Invite volunteers</CardTitle>
                <CardDescription>
                  This campaign is invite-only — it never appears in public browse. Search and
                  invite specific volunteers; accepting creates their accepted application.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <InviteVolunteersPanel campaignId={id} invites={invites} />
              </CardContent>
            </Card>
          </TabsContent>
        ) : null}

        <TabsContent value="funds" className="mt-4 space-y-6">
          <FundLedger campaign={campaign} allocations={funds} teamMembers={teamMembers} />
        </TabsContent>

        {completed ? (
          <TabsContent value="ratings" className="mt-4 space-y-6">
            <Card className="shadow-soft">
              <CardHeader>
                <CardTitle>Rate your team</CardTitle>
                <CardDescription>
                  Ratings are public, appear on volunteer profiles, and update their average
                  score. Only team members of this completed campaign can be rated.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                {reportableVolunteers.length === 0 ? (
                  <EmptyState
                    icon={Users}
                    title="No volunteers to rate"
                    hint="Add volunteers to your campaign team — they become rateable once the work is done."
                    className="md:col-span-2"
                  />
                ) : (
                  reportableVolunteers
                    .map((m, i) => (
                      <RatingForm
                        key={m.user_id}
                        className={
                          reportableVolunteers.length % 2 === 1 &&
                          i === reportableVolunteers.length - 1
                            ? "md:col-span-2"
                            : undefined
                        }
                        campaignId={id}
                        rateeId={m.user_id}
                        rateeName={m.profile?.name ?? "Volunteer"}
                        myRating={ratings.find((r) => r.to_user_id === m.user_id && r.from_user_id === user.id) ?? null}
                        canRate={!ratedByMe.has(m.user_id) && completed}
                        reason={
                          ratedByMe.has(m.user_id)
                            ? "You have already rated this volunteer."
                            : undefined
                        }
                      />
                    ))
                )}
              </CardContent>
            </Card>

            <Card className="shadow-soft">
              <CardHeader>
                <CardTitle>Ratings received for this campaign</CardTitle>
                <CardDescription>
                  What your team said about your organisation.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {ratings.filter((r) => r.to_user_id === user.id).length === 0 ? (
                  <EmptyState
                    icon={Star}
                    title="No ratings received yet"
                    hint="Feedback from your team appears here after the campaign is completed."
                  />
                ) : (
                  <ul className="space-y-3">
                    {ratings
                      .filter((r) => r.to_user_id === user.id)
                      .map((r) => (
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
          </TabsContent>
        ) : null}

        <TabsContent value="edit" className="mt-4 space-y-6">
          <Card className="shadow-soft">
            <CardHeader>
              <CardTitle>Edit campaign</CardTitle>
              <CardDescription>
                Changes are visible to everyone who can see the campaign.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <CampaignForm
                mode="edit"
                initial={{
                  title: campaign.title,
                  description: campaign.description ?? "",
                  objectives: campaign.objectives ?? "",
                  location: campaign.location ?? "",
                  start_date: campaign.start_date ?? "",
                  end_date: campaign.end_date ?? "",
                  type: campaign.type,
                  status: campaign.status,
                  total_budget: String(Number(campaign.total_budget ?? 0)),
                  image_url: campaign.image_url ?? "",
                }}
                submit={updateCampaign.bind(null, id)}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* report volunteers — visible with a team */}
      {reportableVolunteers.length > 0 ? (
        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle>Report a volunteer</CardTitle>
            <CardDescription>
              For serious conduct issues — visible only to platform administrators.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="divide-y rounded-xl border">
              {reportableVolunteers.map((m) => (
                <li
                  key={m.user_id}
                  className="flex min-h-16 flex-wrap items-center justify-between gap-x-3 gap-y-2 px-4 py-3"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <UserAvatar
                      name={m.profile?.name}
                      src={m.profile?.avatar_url}
                      className="h-9 w-9 text-xs"
                    />
                    <div className="min-w-0">
                      <p className="truncate font-medium">{m.profile?.name ?? "Volunteer"}</p>
                      <p className="text-sm text-muted-foreground">Volunteer</p>
                    </div>
                  </div>
                  <ReportVolunteerDialog
                    volunteerId={m.user_id}
                    campaignId={id}
                    volunteerName={m.profile?.name ?? "Volunteer"}
                  />
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
