import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { Megaphone } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import { PageHeader } from "@/components/PageHeader";
import { CampaignCard } from "@/components/campaigns/CampaignCard";
import { BrowseSearchBar } from "./search-bar";
import type { Campaign } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function BrowsePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  const { q, status } = await searchParams;
  const supabase = await createClient();

  // Public campaigns from approved NGOs only (RLS also enforces this);
  // invite-only campaigns never appear here (spec §5 Browse Campaigns).
  let query = supabase
    .from("campaigns")
    .select(
      "*, ngo:ngos!campaigns_ngo_id_fkey(profile_id, org_name, verification_status, avg_rating, logo_url, profile:profiles!ngos_profile_id_fkey(suspended))"
    )
    .eq("type", "public")
    .neq("status", "cancelled")
    .order("created_at", { ascending: false });

  if (status && status !== "all" && ["upcoming", "ongoing", "completed"].includes(status)) {
    query = query.eq("status", status);
  }

  const { data } = await query;
  let campaigns = (data ?? []) as Array<
    Campaign & { ngo?: { profile?: { suspended?: boolean } | null } }
  >;

  // Approved NGOs only, and a suspended NGO's operation is taken down from
  // public view until the admin unsuspends them (extra guard beyond RLS)
  campaigns = campaigns.filter(
    (c) => c.ngo?.verification_status === "approved" && !c.ngo?.profile?.suspended
  );

  if (q?.trim()) {
    const needle = q.trim().toLowerCase();
    campaigns = campaigns.filter(
      (c) =>
        c.title.toLowerCase().includes(needle) ||
        (c.location ?? "").toLowerCase().includes(needle) ||
        (c.ngo?.org_name ?? "").toLowerCase().includes(needle)
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Browse campaigns"
        subtitle="Public campaigns from verified NGOs. Invite-only campaigns reach you by invitation instead."
      />

      <Suspense fallback={null}>
        <BrowseSearchBar />
      </Suspense>

      {campaigns.length === 0 ? (
        <EmptyState
          icon={Megaphone}
          title={q ? `No campaigns match “${q}”` : "No campaigns right now"}
          hint={
            q
              ? "Try a different word — campaign titles, locations, and NGO names are searched."
              : "Check back soon — new campaigns appear here as NGOs publish them."
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {campaigns.map((c) => (
            <CampaignCard key={c.id} campaign={c} href={`/volunteer/campaigns/${c.id}`} />
          ))}
        </div>
      )}
    </div>
  );
}
