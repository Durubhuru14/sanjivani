import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { toCsv, slugify } from "@/lib/format";
import { formatMoney } from "@/lib/funds";
import type { Campaign, Team, FundAllocation } from "@/lib/types";

/**
 * POST /api/export/[campaignId] (spec §8) — CSV of team + fund summary.
 * NGO owner only (RLS makes non-owned campaigns invisible → 404/403).
 */
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ campaignId: string }> }
) {
  const auth = await requireRole("ngo");
  if ("error" in auth) return auth.error;
  const { campaignId } = await params;
  const supabase = auth.supabase;

  const { data: campaign } = await supabase
    .from("campaigns")
    .select("*")
    .eq("id", campaignId)
    .limit(1)
    .maybeSingle();
  if (!campaign || campaign.ngo_id !== auth.profile.id) {
    return NextResponse.json(
      { success: false, error: { message: "Campaign not found or not yours.", code: "FORBIDDEN" } },
      { status: 403 }
    );
  }
  const c = campaign as Campaign;

  const { data: teams } = await supabase
    .from("teams")
    .select("id, name, team_members(id, user_id, member_type, hours_logged, profiles!team_members_user_id_fkey(name))")
    .eq("campaign_id", campaignId);

  const { data: funds } = await supabase
    .from("fund_allocations")
    .select("id, member_id, amount, note, status, created_at, profiles!fund_allocations_member_id_fkey(name)")
    .eq("campaign_id", campaignId)
    .order("created_at", { ascending: true });

  type TeamRow = Team & {
    team_members: Array<{
      id: string;
      user_id: string;
      member_type: "staff" | "volunteer";
      hours_logged: number;
      profiles: { name: string | null } | null;
    }>;
  };
  type FundRow = FundAllocation & { profiles: { name: string | null } | null };

  const allocated = (funds as FundRow[] | null ?? []).reduce((sum, f) => sum + Number(f.amount), 0);

  const rows: Array<Array<unknown>> = [
    ["Campaign", c.title],
    ["Status", c.status],
    ["Type", c.type],
    ["Start date", c.start_date ?? ""],
    ["End date", c.end_date ?? ""],
    ["Total budget", formatMoney(Number(c.total_budget))],
    ["Allocated", formatMoney(allocated)],
    ["Remaining", formatMoney(Number(c.remaining_budget))],
    [],
    ["TEAM"],
    ["Team", "Name", "Role", "Hours logged"],
  ];
  for (const team of (teams as TeamRow[] | null) ?? []) {
    for (const m of team.team_members ?? []) {
      rows.push([
        team.name,
        m.profiles?.name ?? m.user_id.slice(0, 8),
        m.member_type,
        Number(m.hours_logged ?? 0),
      ]);
    }
  }
  rows.push([]);
  rows.push(["FUNDS"]);
  rows.push(["Member", "Amount", "Status", "Note", "Recorded at"]);
  for (const f of (funds as FundRow[] | null) ?? []) {
    rows.push([
      f.profiles?.name ?? f.member_id.slice(0, 8),
      formatMoney(Number(f.amount)),
      f.status,
      f.note ?? "",
      f.created_at,
    ]);
  }

  const csv = toCsv(rows);
  const filename = `sanjivani-${slugify(c.title)}.csv`;

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
