import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Megaphone, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/EmptyState";
import { CampaignCard } from "@/components/campaigns/CampaignCard";
import type { Campaign } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function NgoCampaignsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("campaigns")
    .select("*")
    .eq("ngo_id", user.id)
    .order("created_at", { ascending: false });

  const campaigns = (data ?? []) as Campaign[];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Campaigns</h1>
          <p className="mt-1 text-muted-foreground">
            Everything your organisation is running — or has finished.
          </p>
        </div>
        <Button asChild className="gap-2">
          <Link href="/ngo/campaigns/new">
            <Plus className="h-4 w-4" aria-hidden /> New campaign
          </Link>
        </Button>
      </div>

      {campaigns.length === 0 ? (
        <EmptyState
          icon={Megaphone}
          title="No campaigns yet"
          hint="Create your first one — describe the goal, set a budget, and publish it."
          action={
            <Button asChild>
              <Link href="/ngo/campaigns/new">Create your first campaign</Link>
            </Button>
          }
        />
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {campaigns.map((c) => (
            <CampaignCard key={c.id} campaign={c} href={`/ngo/campaigns/${c.id}`} />
          ))}
        </div>
      )}
    </div>
  );
}
