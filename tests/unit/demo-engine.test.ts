/**
 * Demo engine — business-rule guard + notification coverage tests.
 *
 * The engine mirrors the Postgres BEFORE/AFTER triggers (00004 + 00007) so
 * demo mode rejects the same illegal writes and fires the same in-app
 * notifications as live mode. These tests pin that parity down against the
 * seeded store (spec §19: RLS-adjacent helper functions).
 */
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { execute } from "@/lib/demo/engine";
import { resetStore, getStore } from "@/lib/demo/store";
import type { DemoOp } from "@/lib/demo/types";

// seeded ids (lib/demo/store.ts — mirrors supabase/seed.sql)
const U = {
  admin: "a0000000-0000-4000-8000-000000000001",
  greenearth: "a0000000-0000-4000-8000-000000000002",
  brightfutures: "a0000000-0000-4000-8000-000000000003",
  meera: "a0000000-0000-4000-8000-000000000005",
  priya: "a0000000-0000-4000-8000-000000000007",
  rahul: "a0000000-0000-4000-8000-000000000008",
  aisha: "a0000000-0000-4000-8000-000000000009",
};
const C = {
  river: "c0000000-0000-4000-8000-000000000001", // upcoming, public, greenearth
  tutoring: "c0000000-0000-4000-8000-000000000002", // ongoing, public, brightfutures
  plantation: "c0000000-0000-4000-8000-000000000003", // completed, greenearth
  shelter: "c0000000-0000-4000-8000-000000000004", // upcoming, invite, brightfutures
};
const T = { educators: "f0000000-0000-4000-8000-000000000001" }; // tutoring team

function run(op: DemoOp) {
  return execute(op);
}

const eq = (col: string, val: unknown) => ({ col, op: "eq" as const, val });

function notificationsFor(userId: string) {
  return (
    run({
      t: "select",
      table: "notifications",
      columns: "type, message",
      filters: [eq("user_id", userId)],
      order: [{ col: "created_at", asc: false }],
    }).data as Array<{ type: string; message: string }> ?? []
  );
}

beforeEach(() => {
  resetStore();
});

afterEach(() => {
  resetStore();
});

describe("campaign guards (00004 validate_campaign + sync_campaign_budget)", () => {
  it("rejects an end date before the start date", () => {
    const r = run({
      t: "insert",
      table: "campaigns",
      values: [
        {
          ngo_id: U.greenearth,
          title: "Bad dates",
          start_date: "2026-12-10",
          end_date: "2026-12-01",
          total_budget: 100,
        },
      ],
    });
    expect(r.error?.message).toBe("END_DATE_BEFORE_START");
  });

  it("rejects a negative budget", () => {
    const r = run({
      t: "insert",
      table: "campaigns",
      values: [{ ngo_id: U.greenearth, title: "Negative", total_budget: -5 }],
    });
    expect(r.error?.message).toBe("BUDGET_NEGATIVE");
  });

  it("rejects lowering total_budget below what is already allocated", () => {
    // tutoring has 3500 allocated (1500 + 2000)
    const r = run({
      t: "update",
      table: "campaigns",
      values: { total_budget: 3000 },
      filters: [eq("id", C.tutoring)],
    });
    expect(r.error?.message).toBe("TOTAL_BELOW_ALLOCATED");
  });
});

describe("fund allocation guards (00004 guard_fund_allocation_update)", () => {
  it("rejects editing the amount of an existing allocation", () => {
    const r = run({
      t: "update",
      table: "fund_allocations",
      values: { amount: 999 },
      filters: [eq("campaign_id", C.tutoring), eq("status", "pending")],
    });
    expect(r.error?.message).toBe("FUND_AMOUNT_IMMUTABLE");
  });

  it("rejects moving a paid allocation back to pending", () => {
    const r = run({
      t: "update",
      table: "fund_allocations",
      values: { status: "pending" },
      filters: [eq("campaign_id", C.tutoring), eq("status", "paid")],
    });
    expect(r.error?.message).toBe("FUND_ALREADY_PAID");
  });
});

describe("application + invite guards (00004 validate_application / invites)", () => {
  it("rejects applying to an invite-only campaign without an accepted invite", () => {
    const r = run({
      t: "insert",
      table: "applications",
      values: [{ volunteer_id: U.rahul, campaign_id: C.shelter }],
    });
    expect(r.error?.message).toBe("APPLICATION_REQUIRES_INVITE");
  });

  it("blocks a pending invite from being answered twice", () => {
    run({
      t: "update",
      table: "campaign_invites",
      values: { status: "declined" },
      filters: [eq("volunteer_id", U.aisha), eq("status", "pending")],
    });
    const r = run({
      t: "update",
      table: "campaign_invites",
      values: { status: "accepted" },
      filters: [eq("volunteer_id", U.aisha)],
    });
    expect(r.error?.message).toBe("INVITE_ALREADY_ANSWERED");
  });
});

describe("team member guards (00004 validate_team_member / guard update)", () => {
  it("rejects a volunteer without an accepted application", () => {
    const r = run({
      t: "insert",
      table: "team_members",
      values: [{ team_id: T.educators, user_id: U.aisha, member_type: "volunteer" }],
    });
    expect(r.error?.message).toBe("VOLUNTEER_MUST_BE_ACCEPTED");
  });

  it("rejects logging hours before the campaign completes", () => {
    const r = run({
      t: "update",
      table: "team_members",
      values: { hours_logged: 5 },
      filters: [eq("team_id", T.educators), eq("user_id", U.priya)],
    });
    expect(r.error?.message).toBe("HOURS_ONLY_AFTER_COMPLETION");
  });
});

describe("rating guards (00007 validate_rating — NGO owner is a participant)", () => {
  it("rejects self-rating", () => {
    const r = run({
      t: "insert",
      table: "ratings",
      values: [
        { campaign_id: C.plantation, from_user_id: U.priya, to_user_id: U.priya, score: 5 },
      ],
    });
    expect(r.error?.message).toBe("NO_SELF_RATING");
  });

  it("rejects rating on a campaign that is not completed", () => {
    const r = run({
      t: "insert",
      table: "ratings",
      values: [
        { campaign_id: C.tutoring, from_user_id: U.priya, to_user_id: U.brightfutures, score: 5 },
      ],
    });
    expect(r.error?.message).toBe("RATING_REQUIRES_COMPLETED_CAMPAIGN");
  });

  it("rejects rating someone from outside the campaign", () => {
    // aisha has no team membership on plantation and is not its owner
    const r = run({
      t: "insert",
      table: "ratings",
      values: [
        { campaign_id: C.plantation, from_user_id: U.aisha, to_user_id: U.greenearth, score: 4 },
      ],
    });
    expect(r.error?.message).toBe("RATING_REQUIRES_SHARED_TEAM");
  });

  it("allows volunteer → NGO and NGO → volunteer on a completed campaign", () => {
    // meera is on the plantation team, no seed rating pairs her with greenearth
    const toNgo = run({
      t: "insert",
      table: "ratings",
      values: [
        { campaign_id: C.plantation, from_user_id: U.meera, to_user_id: U.greenearth, score: 5 },
      ],
    });
    expect(toNgo.error).toBeNull();

    const fromNgo = run({
      t: "insert",
      table: "ratings",
      values: [
        { campaign_id: C.plantation, from_user_id: U.greenearth, to_user_id: U.meera, score: 4 },
      ],
    });
    expect(fromNgo.error).toBeNull();
  });
});

describe("suspension takes down the NGO's operation (00007 RLS parity)", () => {
  it("blocks new applications to a suspended NGO's campaign", () => {
    run({
      t: "update",
      table: "profiles",
      values: { suspended: true },
      filters: [eq("id", U.greenearth)],
    });
    // rahul has no existing application on river
    const r = run({
      t: "insert",
      table: "applications",
      values: [{ volunteer_id: U.rahul, campaign_id: C.river }],
    });
    expect(r.error?.message).toBe("NGO_SUSPENDED");
  });
});

describe("notification coverage (00007 triggers, end to end)", () => {
  it("notifies the NGO when a volunteer applies", () => {
    run({
      t: "insert",
      table: "applications",
      values: [{ volunteer_id: U.rahul, campaign_id: C.river }],
    });
    const types = notificationsFor(U.greenearth).map((n) => n.type);
    expect(types).toContain("new_application");
  });

  it("notifies every team member when a campaign status changes", () => {
    run({
      t: "update",
      table: "campaigns",
      values: { status: "completed" },
      filters: [eq("id", C.tutoring)],
    });
    for (const uid of [U.meera, U.priya, U.rahul]) {
      const types = notificationsFor(uid).map((n) => n.type);
      expect(types).toContain("campaign_status");
    }
  });

  it("notifies the rated user when a rating lands", () => {
    run({
      t: "insert",
      table: "ratings",
      values: [
        { campaign_id: C.plantation, from_user_id: U.meera, to_user_id: U.greenearth, score: 5 },
      ],
    });
    const types = notificationsFor(U.greenearth).map((n) => n.type);
    expect(types).toContain("rating_received");
  });

  it("notifies admins when a report is filed and the NGO when it is answered", () => {
    run({
      t: "insert",
      table: "volunteer_reports",
      values: [
        {
          volunteer_id: U.rahul,
          reported_by: U.brightfutures,
          campaign_id: C.tutoring,
          reason: "test reason",
        },
      ],
    });
    expect(notificationsFor(U.admin)[0]?.type).toBe("volunteer_report");

    const report = getStore().tables.volunteer_reports.find(
      (r) => r.reported_by === U.brightfutures
    );
    run({
      t: "update",
      table: "volunteer_reports",
      values: { status: "reviewed" },
      filters: [eq("id", report?.id)],
    });
    expect(notificationsFor(U.brightfutures)[0]?.type).toBe("report_status");
  });

  it("notifies the account on suspension and unsuspension", () => {
    run({
      t: "update",
      table: "profiles",
      values: { suspended: true },
      filters: [eq("id", U.rahul)],
    });
    expect(notificationsFor(U.rahul).map((n) => n.type)).toContain("account_suspended");

    run({
      t: "update",
      table: "profiles",
      values: { suspended: false },
      filters: [eq("id", U.rahul)],
    });
    expect(notificationsFor(U.rahul).map((n) => n.type)).toContain("account_unsuspended");
  });

  it("notifies the volunteer when hours are logged after completion", () => {
    run({
      t: "update",
      table: "campaigns",
      values: { status: "completed" },
      filters: [eq("id", C.tutoring)],
    });
    run({
      t: "update",
      table: "team_members",
      values: { hours_logged: 12 },
      filters: [eq("team_id", T.educators), eq("user_id", U.priya)],
    });
    expect(notificationsFor(U.priya).map((n) => n.type)).toContain("hours_logged");
  });

  it("notifies the NGO when their invite is declined", () => {
    run({
      t: "update",
      table: "campaign_invites",
      values: { status: "declined" },
      filters: [eq("volunteer_id", U.aisha), eq("status", "pending")],
    });
    expect(notificationsFor(U.brightfutures).map((n) => n.type)).toContain("invite_declined");
  });

  it("notifies a member when they are removed from a team", () => {
    run({
      t: "delete",
      table: "team_members",
      filters: [eq("team_id", T.educators), eq("user_id", U.rahul)],
    });
    expect(notificationsFor(U.rahul)[0]?.type).toBe("team_removed");
  });
});
