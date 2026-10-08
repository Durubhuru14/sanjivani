import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { MessagesSquare } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/PageHeader";
import { RoomList } from "@/components/chat/RoomList";
import { CreateRoomDialog } from "@/components/chat/CreateRoomDialog";
import type { ChatRoom, Team } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function CampaignChatPage({
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
    .select("id, title, ngo_id")
    .eq("id", id)
    .limit(1)
    .maybeSingle();
  const campaign = campaignRow;
  if (!campaign || campaign.ngo_id !== user.id) notFound();

  const [{ data: roomsData }, { data: teamsData }] = await Promise.all([
    supabase
      .from("chat_rooms")
      .select("*, members:chat_room_members(user_id)")
      .eq("campaign_id", id)
      .order("created_at", { ascending: false }),
    supabase
      .from("teams")
      .select("*, members:team_members(*, profile:profiles!team_members_user_id_fkey(id, name, avatar_url))")
      .eq("campaign_id", id),
  ]);

  const rooms = (roomsData ?? []) as unknown as ChatRoom[];
  const teams = (teamsData ?? []) as unknown as Team[];
  const teamMembers = teams.flatMap((t) => t.members ?? []);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader
        backHref={`/ngo/campaigns/${id}`}
        backLabel="Back to campaign"
        title="Chat rooms"
        subtitle={
          <>
            Rooms for “{campaign.title}”. Only the members you pick can see each room.
          </>
        }
        action={<CreateRoomDialog campaignId={id} teamMembers={teamMembers} />}
      />

      <Card className="shadow-soft">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessagesSquare className="h-5 w-5 text-primary" aria-hidden /> Rooms
          </CardTitle>
          <CardDescription>
            Create one room per topic — planning, field updates, logistics — and pick who
            belongs in each.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RoomList rooms={rooms} basePath={`/ngo/campaigns/${id}/chat/`} />
        </CardContent>
      </Card>
    </div>
  );
}
