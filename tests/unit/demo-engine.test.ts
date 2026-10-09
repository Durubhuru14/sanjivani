/**
 * Demo engine — smoke tests for the basic, ephemeral demo store.
 *
 * Demo mode is intentionally NOT a faithful backend replica (see the header
 * of lib/demo/engine.ts): business rules live in the Postgres triggers and
 * RLS policies of a real Supabase deployment. These tests pin what demo
 * mode DOES promise — the PostgREST query mechanics the pages rely on,
 * insert defaults, and the two live aggregates the UI displays.
 */
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { execute } from "@/lib/demo/engine";
import { resetStore } from "@/lib/demo/store";
import type { DemoOp } from "@/lib/demo/types";

// seeded ids (lib/demo/store.ts — mirrors supabase/seed.sql)
const U = {
  greenearth: "a0000000-0000-4000-8000-000000000002",
  priya: "a0000000-0000-4000-8000-000000000007",
  aisha: "a0000000-0000-4000-8000-000000000009",
};
const C = {
  river: "c0000000-0000-4000-8000-000000000001", // upcoming, public, greenearth
  tutoring: "c0000000-0000-4000-8000-000000000002", // ongoing, public, brightfutures
  plantation: "c0000000-0000-4000-8000-000000000003", // completed, greenearth
};
const T = { educators: "f0000000-0000-4000-8000-000000000001" }; // tutoring team

function run(op: DemoOp) {
  return execute(op);
}

const eq = (col: string, val: unknown) => ({ col, op: "eq" as const, val });

beforeEach(() => {
  resetStore();
});

afterEach(() => {
  resetStore();
});

describe("query mechanics", () => {
  it("filters with eq / in / ilike and orders the result", () => {
    const campaigns = run({
      t: "select",
      table: "campaigns",
      columns: "title",
      filters: [{ col: "status", op: "in", val: ["upcoming", "ongoing"] }],
      order: [{ col: "created_at", asc: true }],
    }).data as Array<{ title: string }>;
    expect(campaigns.map((c) => c.title)).toEqual([
      "After-School Tutoring Program",
      "River Clean-Up Drive",
      "Winter Shelter Support",
    ]);

    const search = run({
      t: "select",
      table: "campaigns",
      columns: "title",
      filters: [{ col: "title", op: "ilike", val: "%river%" }],
      order: [],
    }).data as Array<{ title: string }>;
    expect(search).toHaveLength(1);
    expect(search[0].title).toBe("River Clean-Up Drive");
  });

  it("resolves forward and reverse embeds", () => {
    // forward: campaign -> owning ngo
    const withNgo = run({
      t: "select",
      table: "campaigns",
      columns: "title, ngo:ngos(org_name)",
      filters: [eq("id", C.river)],
      order: [],
      single: true,
    }).data as { ngo: { org_name: string } } | null;
    expect(withNgo?.ngo.org_name).toBe("Green Earth Foundation");

    // reverse: campaign -> its teams
    const withTeams = run({
      t: "select",
      table: "campaigns",
      columns: "title, teams(name)",
      filters: [eq("id", C.tutoring)],
      order: [],
      single: true,
    }).data as { teams: Array<{ name: string }> } | null;
    expect(withTeams?.teams.map((t) => t.name)).toEqual(["Educators"]);
  });

  it("maybeSingle returns null for no rows, single errors", () => {
    const maybe = run({
      t: "select",
      table: "campaigns",
      columns: "*",
      filters: [eq("id", "00000000-0000-0000-0000-000000000000")],
      order: [],
      single: true,
      maybe: true,
    });
    expect(maybe.data).toBeNull();
    expect(maybe.error).toBeNull();

    const single = run({
      t: "select",
      table: "campaigns",
      columns: "*",
      filters: [eq("id", "00000000-0000-0000-0000-000000000000")],
      order: [],
      single: true,
    });
    expect(single.error?.code).toBe("PGRST116");
  });
});

describe("writes are permissive and defaulted (no trigger emulation)", () => {
  it("inserts with generated id, created_at and the status default", () => {
    const r = run({
      t: "insert",
      table: "applications",
      values: [{ volunteer_id: U.aisha, campaign_id: C.river }],
      columns: "*",
      single: true,
    });
    expect(r.error).toBeNull();
    const row = r.data as Record<string, unknown>;
    expect(row.id).toBeTruthy();
    expect(row.created_at).toBeTruthy();
    expect(row.status).toBe("pending");

    // demo mode does NOT duplicate the unique-application trigger:
    // the same insert again is accepted (a real backend would 409)
    const again = run({
      t: "insert",
      table: "applications",
      values: [{ volunteer_id: U.aisha, campaign_id: C.river }],
    });
    expect(again.error).toBeNull();
  });

  it("updates and deletes by filter", () => {
    const upd = run({
      t: "update",
      table: "campaigns",
      values: { status: "ongoing" },
      filters: [eq("id", C.river)],
      columns: "status",
      single: true,
    });
    expect((upd.data as { status: string }).status).toBe("ongoing");

    const del = run({
      t: "delete",
      table: "team_members",
      filters: [eq("team_id", T.educators), eq("user_id", U.priya)],
    });
    expect(del.error).toBeNull();
    const left = run({
      t: "select",
      table: "team_members",
      columns: "user_id",
      filters: [eq("team_id", T.educators)],
      order: [],
    }).data as Array<{ user_id: string }>;
    expect(left.map((m) => m.user_id)).not.toContain(U.priya);
  });

  it("zero-row updates succeed quietly — PostgREST parity for idempotent retries", () => {
    // a plain update that matches nothing returns an empty representation,
    // not an error (double-clicked buttons, mark-all-read with nothing unread)
    const plain = run({
      t: "update",
      table: "campaigns",
      values: { status: "ongoing" },
      filters: [eq("id", "00000000-0000-0000-0000-000000000000")],
      columns: "status",
    });
    expect(plain.error).toBeNull();
    expect(plain.data).toEqual([]);

    // only .single() turns a zero-row update into PGRST116, like PostgREST
    const single = run({
      t: "update",
      table: "campaigns",
      values: { status: "ongoing" },
      filters: [eq("id", "00000000-0000-0000-0000-000000000000")],
      columns: "status",
      single: true,
    });
    expect(single.error?.code).toBe("PGRST116");

    // and a no-representation update matches nothing without erroring
    const bare = run({
      t: "update",
      table: "campaigns",
      values: { status: "ongoing" },
      filters: [eq("id", "00000000-0000-0000-0000-000000000000")],
    });
    expect(bare.error).toBeNull();
  });
});

describe("the two live aggregates the UI displays", () => {
  it("resyncs remaining_budget when fund allocations change", () => {
    // tutoring: 50000 budget, 3500 allocated → 46500 remaining (seeded)
    run({
      t: "insert",
      table: "fund_allocations",
      values: [{ campaign_id: C.tutoring, member_id: U.priya, amount: 1500, note: "test" }],
    });
    const afterInsert = run({
      t: "select",
      table: "campaigns",
      columns: "remaining_budget",
      filters: [eq("id", C.tutoring)],
      order: [],
      single: true,
    }).data as { remaining_budget: number };
    expect(afterInsert.remaining_budget).toBe(45000);

    run({
      t: "delete",
      table: "fund_allocations",
      filters: [eq("campaign_id", C.tutoring), eq("amount", 1500), eq("status", "pending")],
    });
    const afterDelete = run({
      t: "select",
      table: "campaigns",
      columns: "remaining_budget",
      filters: [eq("id", C.tutoring)],
      order: [],
      single: true,
    }).data as { remaining_budget: number };
    expect(afterDelete.remaining_budget).toBe(46500);
  });

  it("recomputes avg_rating when a rating lands", () => {
    // plantation is completed; meera is on its team (seed), no meera→greenearth rating yet
    run({
      t: "insert",
      table: "ratings",
      values: [
        { campaign_id: C.plantation, from_user_id: "a0000000-0000-4000-8000-000000000005", to_user_id: U.greenearth, score: 1 },
      ],
    });
    const ngo = run({
      t: "select",
      table: "ngos",
      columns: "avg_rating",
      filters: [eq("profile_id", U.greenearth)],
      order: [],
      single: true,
    }).data as { avg_rating: number };
    // seeded greenearth ratings: 5 + 4 + 4 = 13/3 ≈ 4.33; +1 → 14/4 = 3.5
    expect(ngo.avg_rating).toBe(3.5);
  });
});

describe("rpc", () => {
  it("sums a volunteer's logged hours", () => {
    const hours = run({
      t: "rpc",
      fn: "volunteer_total_hours",
      args: { p_volunteer_id: U.priya },
    }).data;
    expect(hours).toBe(18); // 0 (educators) + 18 (core team)
  });
});
