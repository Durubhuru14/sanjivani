import { NextResponse } from "next/server";
import { z } from "zod";

/** Standard response format (spec §8). */

export function ok(data: unknown = {}, status = 200) {
  return NextResponse.json({ success: true, data }, { status });
}

export function fail(message: string, code = "BAD_REQUEST", status = 400) {
  return NextResponse.json(
    { success: false, error: { message, code } },
    { status }
  );
}

/** Map Supabase/Postgres error codes + custom RAISE exceptions to friendly messages. */
export function friendlyDbError(err: unknown): { message: string; code: string } {
  const e = err as { message?: string; code?: string; details?: string; hint?: string };
  const raw = e?.message ?? "Unexpected database error";

  const known: Array<[string, string]> = [
    ["FUND_EXCEEDS_REMAINING", "That amount is more than the campaign's remaining budget."],
    ["FUND_AMOUNT_POSITIVE", "The amount must be greater than zero."],
    ["FUND_AMOUNT_IMMUTABLE", "Allocations cannot be edited — remove the entry and create a new one."],
    ["FUND_ALREADY_PAID", "This allocation is already marked paid."],
    ["DUPLICATE_APPLICATION", "This volunteer already has a pending or accepted application for this campaign."],
    ["APPLICATION_REQUIRES_INVITE", "This campaign is invite-only — join through your invitation."],
    ["DUPLICATE_INVITE", "This volunteer already has a pending invite for this campaign."],
    ["INVITE_ONLY_CAMPAIGN", "Volunteers can only be invited to invite-only campaigns."],
    ["INVITE_ALREADY_ANSWERED", "This invitation has already been answered."],
    ["STAFF_MUST_BE_ACTIVE_FOR_NGO", "This staff member has not claimed their invite yet."],
    ["VOLUNTEER_MUST_BE_ACCEPTED", "Only accepted volunteers can join the team."],
    ["ROOM_MEMBER_MUST_BE_ON_TEAM", "Chat room members must already be on the campaign team."],
    ["HOURS_ONLY_AFTER_COMPLETION", "Hours can only be logged once the campaign is completed."],
    ["HOURS_NEGATIVE", "Hours cannot be negative."],
    ["RATING_REQUIRES_COMPLETED_CAMPAIGN", "Ratings open once the campaign is completed."],
    ["RATING_REQUIRES_SHARED_TEAM", "You can only rate people you served with on this campaign."],
    ["RATING_ALREADY_GIVEN", "You have already submitted a rating for this campaign."],
    ["NO_SELF_RATING", "You cannot rate yourself."],
    ["END_DATE_BEFORE_START", "The end date must be on or after the start date."],
    ["BUDGET_NEGATIVE", "The budget must be zero or more."],
    ["TOTAL_BELOW_ALLOCATED", "You cannot reduce the budget below what is already allocated."],
    ["PROFILE_ROLE_IMMUTABLE", "Your role cannot be changed here."],
    ["PROFILE_SUSPEND_ADMIN_ONLY", "Only an admin can suspend accounts."],
    ["NGO_VERIFICATION_ADMIN_ONLY", "Only an admin can change NGO verification."],
    ["VOLUNTEER_VERIFICATION_ADMIN_ONLY", "Only an admin can change volunteer verification."],
  ];
  for (const [code, message] of known) {
    if (raw.includes(code)) return { message, code };
  }
  if (e?.code === "23505" || /duplicate key|unique constraint/i.test(raw)) {
    return { message: "That entry already exists.", code: "DUPLICATE" };
  }
  if (e?.code === "42501" || /row-level security/i.test(raw)) {
    return { message: "You do not have permission to do that.", code: "FORBIDDEN" };
  }
  return { message: raw, code: e?.code ?? "DB_ERROR" };
}

/** Parse + validate a JSON body with a Zod schema; returns field errors. */
export async function parseBody<T extends z.ZodTypeAny>(
  req: Request,
  schema: T
): Promise<
  { success: true; data: z.infer<T> } | { success: false; response: NextResponse }
> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return { success: false, response: fail("Request body must be valid JSON", "INVALID_JSON") };
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return {
      success: false,
      response: fail(
        first ? `${first.path.join(".") || "body"}: ${first.message}` : "Invalid request body",
        "VALIDATION_ERROR",
        422
      ),
    };
  }
  return { success: true, data: parsed.data };
}
