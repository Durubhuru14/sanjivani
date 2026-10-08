import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ArrowLeft } from "lucide-react";
import { ChatRoom } from "@/components/chat/ChatRoom";

export const dynamic = "force-dynamic";

export default async function VolunteerRoomPage({
  params,
}: {
  params: Promise<{ roomId: string }>;
}) {
  const { roomId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  // RLS: only rooms the volunteer is a member of resolve here
  const { data: room } = await supabase
    .from("chat_rooms")
    .select("id, name, campaign_id, campaigns!inner(title)")
    .eq("id", roomId)
    .limit(1)
    .maybeSingle();
  if (!room) notFound();

  // explicit membership guard — mirrors the chat_room_members RLS policy so
  // demo mode (no RLS) blocks non-members exactly like live mode does
  const { count: memberCount } = await supabase
    .from("chat_room_members")
    .select("id", { count: "exact", head: true })
    .eq("room_id", roomId)
    .eq("user_id", user.id);
  if (!memberCount) notFound();

  const roomData = room as unknown as {
    id: string;
    name: string;
    campaign_id: string;
    campaigns: { title: string };
  };

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <div>
        <Link
          href="/volunteer"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden /> Dashboard
        </Link>
        <p className="mt-1 text-sm text-muted-foreground">
          Room for “{roomData.campaigns.title}”
        </p>
      </div>
      <ChatRoom roomId={roomId} roomName={roomData.name} currentUserId={user.id} />
    </div>
  );
}
