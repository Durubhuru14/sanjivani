import { describe, expect, it } from "vitest";
import {
  campaignSchema,
  fundAllocationSchema,
  hoursSchema,
  inviteRespondSchema,
  loginSchema,
  messageSchema,
  ratingSchema,
  roomMembersSchema,
  signUpSchema,
  staffInviteSchema,
  volunteerReportSchema,
  chatRoomSchema,
} from "@/lib/validation";

describe("signUpSchema (spec §12 email/password + role)", () => {
  const base = {
    email: "ngo@example.org",
    password: "secret1",
    name: "Priya Sharma",
    role: "volunteer",
  };

  it("accepts a valid volunteer signup", () => {
    const res = signUpSchema.safeParse(base);
    expect(res.success).toBe(true);
  });

  it("rejects an invalid email", () => {
    const res = signUpSchema.safeParse({ ...base, email: "not-an-email" });
    expect(res.success).toBe(false);
  });

  it("rejects a password shorter than 6 characters", () => {
    const res = signUpSchema.safeParse({ ...base, password: "abc12" });
    expect(res.success).toBe(false);
  });

  it("requires a non-empty name", () => {
    const res = signUpSchema.safeParse({ ...base, name: "   " });
    expect(res.success).toBe(false);
  });

  it("requires org name and registration number for NGOs", () => {
    const res = signUpSchema.safeParse({ ...base, role: "ngo", orgName: "", registrationNumber: "" });
    expect(res.success).toBe(false);
    if (!res.success) {
      const paths = res.error.issues.map((i) => i.path.join("."));
      expect(paths).toContain("orgName");
      expect(paths).toContain("registrationNumber");
    }
  });

  it("accepts an NGO with complete details", () => {
    const res = signUpSchema.safeParse({
      ...base,
      role: "ngo",
      orgName: "Green Earth Foundation",
      registrationNumber: "GE-2019-114",
    });
    expect(res.success).toBe(true);
  });

  it("rejects an unknown role", () => {
    const res = signUpSchema.safeParse({ ...base, role: "admin" });
    expect(res.success).toBe(false);
  });
});

describe("loginSchema", () => {
  it("requires a valid email and a password", () => {
    expect(loginSchema.safeParse({ email: "a@b.co", password: "x" }).success).toBe(true);
    expect(loginSchema.safeParse({ email: "bad", password: "x" }).success).toBe(false);
    expect(loginSchema.safeParse({ email: "a@b.co", password: "" }).success).toBe(false);
  });
});

describe("campaignSchema (spec §12 campaign rules)", () => {
  const valid = {
    title: "River Clean-Up Drive",
    start_date: "2026-10-01",
    end_date: "2026-10-07",
    type: "public",
    status: "upcoming",
    total_budget: 20000,
  };

  it("accepts a valid campaign", () => {
    expect(campaignSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects an empty title", () => {
    expect(campaignSchema.safeParse({ ...valid, title: " " }).success).toBe(false);
  });

  it("rejects end_date before start_date", () => {
    const res = campaignSchema.safeParse({ ...valid, end_date: "2026-09-30" });
    expect(res.success).toBe(false);
    if (!res.success) {
      expect(res.error.issues[0].message).toMatch(/end date/i);
    }
  });

  it("accepts end_date equal to start_date", () => {
    expect(campaignSchema.safeParse({ ...valid, end_date: "2026-10-01" }).success).toBe(true);
  });

  it("rejects a negative total budget", () => {
    const res = campaignSchema.safeParse({ ...valid, total_budget: -1 });
    expect(res.success).toBe(false);
  });

  it("accepts a zero budget", () => {
    expect(campaignSchema.safeParse({ ...valid, total_budget: 0 }).success).toBe(true);
  });

  it("rejects an invalid status and type", () => {
    expect(campaignSchema.safeParse({ ...valid, status: "paused" }).success).toBe(false);
    expect(campaignSchema.safeParse({ ...valid, type: "private" }).success).toBe(false);
  });

  it("allows dates to be omitted entirely", () => {
    const res = campaignSchema.safeParse({ title: "T", start_date: "", end_date: "" });
    expect(res.success).toBe(true);
  });
});

describe("fundAllocationSchema (spec §12 funds)", () => {
  it("accepts a positive amount", () => {
    expect(fundAllocationSchema.safeParse({ member_id: crypto.randomUUID(), amount: 500 }).success).toBe(true);
  });

  it("rejects zero and negative amounts", () => {
    const member_id = crypto.randomUUID();
    expect(fundAllocationSchema.safeParse({ member_id, amount: 0 }).success).toBe(false);
    expect(fundAllocationSchema.safeParse({ member_id, amount: -50 }).success).toBe(false);
  });

  it("coerces numeric strings", () => {
    expect(fundAllocationSchema.safeParse({ member_id: crypto.randomUUID(), amount: "1500" }).success).toBe(true);
  });
});

describe("ratingSchema (spec §12 ratings)", () => {
  it("accepts scores 1 through 5", () => {
    for (const score of [1, 2, 3, 4, 5]) {
      expect(ratingSchema.safeParse({ score }).success).toBe(true);
    }
  });

  it("rejects 0, 6, non-integers, and missing scores", () => {
    expect(ratingSchema.safeParse({ score: 0 }).success).toBe(false);
    expect(ratingSchema.safeParse({ score: 6 }).success).toBe(false);
    expect(ratingSchema.safeParse({ score: 3.5 }).success).toBe(false);
    expect(ratingSchema.safeParse({}).success).toBe(false);
  });
});

describe("volunteerReportSchema (spec §12 reports)", () => {
  it("requires a reason", () => {
    const ids = { volunteer_id: crypto.randomUUID(), campaign_id: crypto.randomUUID() };
    expect(volunteerReportSchema.safeParse({ ...ids, reason: "" }).success).toBe(false);
    expect(volunteerReportSchema.safeParse({ ...ids, reason: "Absent without notice" }).success).toBe(true);
  });

  it("caps the reason at 1000 characters", () => {
    const ids = { volunteer_id: crypto.randomUUID(), campaign_id: crypto.randomUUID() };
    expect(
      volunteerReportSchema.safeParse({ ...ids, reason: "a".repeat(1001) }).success
    ).toBe(false);
    expect(volunteerReportSchema.safeParse({ ...ids, reason: "a".repeat(1000) }).success).toBe(
      true
    );
  });
});

describe("staffInviteSchema (spec §12 staff invites)", () => {
  it("requires a valid email and a name", () => {
    expect(
      staffInviteSchema.safeParse({ invited_email: "kavita@example.org", invited_name: "Kavita" })
        .success
    ).toBe(true);
    expect(
      staffInviteSchema.safeParse({ invited_email: "nope", invited_name: "Kavita" }).success
    ).toBe(false);
    expect(
      staffInviteSchema.safeParse({ invited_email: "kavita@example.org", invited_name: "" })
        .success
    ).toBe(false);
  });
});

describe("chat validation (spec §12 chat)", () => {
  const room = { campaign_id: crypto.randomUUID(), member_ids: [crypto.randomUUID()] };

  it("requires a room name of 1–100 characters", () => {
    expect(chatRoomSchema.safeParse({ name: "Planning Room", ...room }).success).toBe(true);
    expect(chatRoomSchema.safeParse({ name: "", ...room }).success).toBe(false);
    expect(chatRoomSchema.safeParse({ name: "x".repeat(101), ...room }).success).toBe(false);
  });

  it("chatRoomSchema requires at least one member", () => {
    const campaign_id = crypto.randomUUID();
    expect(
      chatRoomSchema.safeParse({ name: "Room", campaign_id, member_ids: [] }).success
    ).toBe(false);
    expect(
      chatRoomSchema.safeParse({ name: "Room", campaign_id, member_ids: [crypto.randomUUID()] })
        .success
    ).toBe(true);
  });

  it("messageSchema enforces 1–2000 characters", () => {
    expect(messageSchema.safeParse({ text: "hello" }).success).toBe(true);
    expect(messageSchema.safeParse({ text: "" }).success).toBe(false);
    expect(messageSchema.safeParse({ text: "  " }).success).toBe(false);
    expect(messageSchema.safeParse({ text: "x".repeat(2001) }).success).toBe(false);
    expect(messageSchema.safeParse({ text: "x".repeat(2000) }).success).toBe(true);
  });

  it("roomMembersSchema defaults add/remove to empty arrays", () => {
    const res = roomMembersSchema.parse({});
    expect(res.add).toEqual([]);
    expect(res.remove).toEqual([]);
  });
});

describe("hoursSchema / inviteRespondSchema", () => {
  it("hours must be zero or more", () => {
    expect(hoursSchema.safeParse({ hours: 0 }).success).toBe(true);
    expect(hoursSchema.safeParse({ hours: 12 }).success).toBe(true);
    expect(hoursSchema.safeParse({ hours: -1 }).success).toBe(false);
  });

  it("invite response must be accept or decline", () => {
    expect(inviteRespondSchema.safeParse({ action: "accept" }).success).toBe(true);
    expect(inviteRespondSchema.safeParse({ action: "decline" }).success).toBe(true);
    expect(inviteRespondSchema.safeParse({ action: "maybe" }).success).toBe(false);
  });
});
