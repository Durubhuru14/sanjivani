/**
 * Demo mode — query engine (SERVER ONLY).
 *
 * Executes PostgREST-shaped operations against the in-memory store with
 * just enough of the real semantics for the whole product to run:
 * filters (eq/neq/in/ilike/like/gt/gte/lt/lte/or), ordering, limit,
 * single/maybeSingle, exact counts, FK embed resolution, and the same
 * business-rule side effects the Postgres triggers implement
 * (notification events, avg_rating and remaining_budget maintenance,
 * budget guard, unique-index violations).
 */
import { randomUUID } from "node:crypto";
import { resolveRelation } from "./relations";
import { DEFAULT_ID_TABLES, getStore, type Row } from "./store";
import type { DemoOp, Filter, OrderClause, PostgrestLike } from "./types";

type Err = { message: string; code?: string } | null;

function ok<T>(data: T | null, extra: Partial<PostgrestLike<T>> = {}): PostgrestLike<T> {
  return { data, error: null, count: null, status: 200, statusText: "", ...extra };
}

function err(message: string, code = "42501", status = 400): PostgrestLike<null> {
  return { data: null, error: { message, code }, count: null, status, statusText: "" };
}

function pkOf(table: string): string {
  return table === "ngos" || table === "volunteers" ? "profile_id" : "id";
}

function table(name: string): Row[] {
  const t = getStore().tables[name];
  if (!t) throw new Error(`demo: unknown table "${name}"`);
  return t;
}

// ---------------------------------------------------------------- filters

function cmp(a: unknown, b: unknown): number {
  if (a == null && b == null) return 0;
  if (a == null) return -1;
  if (b == null) return 1;
  if (typeof a === "number" && typeof b === "number") return a - b;
  return String(a) < String(b) ? -1 : String(a) > String(b) ? 1 : 0;
}

function ilikeMatch(value: string, pattern: string): boolean {
  const re = new RegExp(
    "^" + pattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/%/g, ".*").replace(/_/g, ".") + "$",
    "i"
  );
  return re.test(value);
}

function matchesFilter(row: Row, f: Filter): boolean {
  const v = row[f.col];
  switch (f.op) {
    case "eq":
      return v === f.val || (v == null && f.val == null) ||
        (typeof v === "number" && typeof f.val === "string" && v === Number(f.val));
    case "is":
      // only NULL / NOTNULL are used by the app
      return f.val == null ? v == null : v != null;
    case "neq":
      return !(v === f.val || (v == null && f.val == null));
    case "in":
      return Array.isArray(f.val) && f.val.some((x) => x === v);
    case "ilike":
      return v != null && ilikeMatch(String(v), String(f.val));
    case "like":
      return v != null && new RegExp("^" + String(f.val).replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/%/g, ".*") + "$").test(String(v));
    case "gt":
      return cmp(v, f.val) > 0;
    case "gte":
      return cmp(v, f.val) >= 0;
    case "lt":
      return cmp(v, f.val) < 0;
    case "lte":
      return cmp(v, f.val) <= 0;
    case "or": {
      // "col.op.value,col.op.value" — PostgREST or= syntax
      const parts = String(f.val).split(",").map((p) => p.trim()).filter(Boolean);
      return parts.some((p) => {
        const m = /^(.+?)\.(eq|neq|ilike|like|gt|gte|lt|lte)\.(.*)$/.exec(p);
        if (!m) return false;
        return matchesFilter(row, { col: m[1], op: m[2] as Filter["op"], val: m[3] });
      });
    }
    default:
      return true;
  }
}

function applyFilters(rows: Row[], filters: Filter[]): Row[] {
  return filters.every((f) => f.op)
    ? rows.filter((r) => filters.every((f) => matchesFilter(r, f)))
    : rows.slice();
}

function applyOrder(rows: Row[], order: OrderClause[]): Row[] {
  if (!order.length) return rows.slice();
  const sorted = rows.slice();
  sorted.sort((a, b) => {
    for (const o of order) {
      const c = cmp(a[o.col], b[o.col]);
      if (c !== 0) return o.asc ? c : -c;
    }
    return 0;
  });
  return sorted;
}

// ---------------------------------------------------------------- embeds

interface Embed {
  key: string; // resulting field name
  /** "column" = unresolvable placeholder | forward fk | reverse table */
  kind: "column" | "forward" | "reverse";
  srcCol?: string; // forward: fk column on the parent row; reverse: fk column on the child
  target?: string; // referenced / child table
  children?: ParsedSelect; // nested columns
}

interface ParsedSelect {
  columns: string[];
  embeds: Embed[];
}

function splitTop(s: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let cur = "";
  for (const ch of s) {
    if (ch === "(") depth++;
    if (ch === ")") depth--;
    if (ch === "," && depth === 0) {
      out.push(cur.trim());
      cur = "";
    } else cur += ch;
  }
  if (cur.trim()) out.push(cur.trim());
  return out.filter(Boolean);
}

function parseSelect(spec: string, parentTable: string): ParsedSelect {
  const result: ParsedSelect = { columns: [], embeds: [] };
  for (const tokenRaw of splitTop(spec)) {
    const token = tokenRaw.trim();
    if (token === "*") {
      result.columns.push("*");
      continue;
    }
    // structural embed parse: `alias:name!hint(inner, spec)` with any nesting depth
    const open = token.indexOf("(");
    if (open === -1) {
      result.columns.push(token);
      continue;
    }
    let depth = 0;
    let close = -1;
    for (let i = open; i < token.length; i++) {
      if (token[i] === "(") depth++;
      else if (token[i] === ")") {
        depth--;
        if (depth === 0) {
          close = i;
          break;
        }
      }
    }
    const head = token.slice(0, open).trim();
    const inner = close > open ? token.slice(open + 1, close).trim() : "";
    const colon = head.indexOf(":");
    const alias = colon > 0 ? head.slice(0, colon).trim() : undefined;
    const rest = colon > 0 ? head.slice(colon + 1).trim() : head;
    const bang = rest.indexOf("!");
    const name = bang > 0 ? rest.slice(0, bang).trim() : rest;
    const hint = bang > 0 ? rest.slice(bang + 1).trim() : undefined;

    if (!name) {
      result.columns.push(token);
      continue;
    }
    const rel = resolveRelation(parentTable, name, hint);
    if (rel) {
      result.embeds.push({
        key: alias ?? name,
        kind: rel.kind,
        srcCol: rel.srcCol,
        target: rel.target,
        children: inner ? parseSelect(inner, rel.target) : undefined,
      });
    } else {
      // unresolvable relationship — emit null rather than failing the whole query
      result.embeds.push({
        key: alias ?? name,
        kind: "column",
        srcCol: undefined,
        target: undefined,
        children: undefined,
      });
    }
  }
  return result;
}

function projectColumns(row: Row, columns: string[]): Row {
  if (columns.includes("*")) return { ...row };
  const out: Row = {};
  for (const c of columns) {
    if (c in row) out[c] = row[c];
  }
  return out;
}

function resolveRow(row: Row, parentTable: string, parsed: ParsedSelect): Row {
  const out = projectColumns(row, parsed.columns);
  for (const e of parsed.embeds) {
    if (e.kind === "column") {
      out[e.key] = null; // unresolvable relationship
      continue;
    }
    if (e.kind === "forward" && e.srcCol && e.target) {
      const target = e.target;
      const val = row[e.srcCol];
      if (val == null) {
        out[e.key] = null;
        continue;
      }
      const ref = table(target).find((r) => r[pkOf(target)] === val) ?? null;
      out[e.key] = ref
        ? resolveRow(ref, target, e.children ?? { columns: ["*"], embeds: [] })
        : null;
    } else if (e.kind === "reverse" && e.srcCol && e.target) {
      // srcCol is the FK column on the child table pointing back at the parent
      const target = e.target;
      const srcCol = e.srcCol;
      const children = table(target).filter((r) => r[srcCol] === row[pkOf(parentTable)]);
      out[e.key] = children.map((c) =>
        resolveRow(c, target, e.children ?? { columns: ["*"], embeds: [] })
      );
    }
  }
  return out;
}

// ------------------------------------------------------- trigger helpers

function notify(userId: unknown, type: string, message: string): void {
  if (!userId) return;
  table("notifications").push({
    id: randomUUID(),
    user_id: userId,
    type,
    message,
    read: false,
    created_at: new Date().toISOString(),
  });
}

function campaignTitle(id: unknown): string {
  if (!id) return "a campaign";
  const c = table("campaigns").find((r) => r.id === id);
  return String(c?.title ?? "a campaign");
}

function profileName(id: unknown): string {
  if (!id) return "Someone";
  const p = table("profiles").find((r) => r.id === id);
  return String(p?.name ?? "Someone");
}

/** All team-member profile ids across every team of a campaign. */
function campaignMemberIds(campaignId: unknown): string[] {
  const ids = new Set<string>();
  for (const t of table("teams")) {
    if (t.campaign_id !== campaignId) continue;
    for (const m of table("team_members")) {
      if (m.team_id === t.id) ids.add(String(m.user_id));
    }
  }
  return [...ids];
}

function findProfileByEmail(email: string): Row | null {
  const u = getStore().users.find((x) => x.email.toLowerCase() === email.toLowerCase());
  if (!u) return null;
  return table("profiles").find((p) => p.id === u.id) ?? null;
}

/* ------------------------------------------------------------------
 * Business-rule guards mirroring the Postgres BEFORE triggers
 * (00004_triggers.sql) so demo mode rejects the same illegal writes.
 * ------------------------------------------------------------------ */

function validateCampaignRow(row: Row): Err {
  if (
    row.start_date != null && row.end_date != null &&
    String(row.end_date) < String(row.start_date)
  ) {
    return { message: "END_DATE_BEFORE_START", code: "23514" };
  }
  const budget = Number(row.total_budget ?? 0);
  if (row.total_budget != null && (!Number.isFinite(budget) || budget < 0)) {
    return { message: "BUDGET_NEGATIVE", code: "23514" };
  }
  return null;
}

function campaignOf(id: unknown): Row | null {
  if (!id) return null;
  return table("campaigns").find((c) => c.id === id) ?? null;
}

function isCampaignTeamMember(campaignId: unknown, userId: unknown): boolean {
  return table("teams").some(
    (t) =>
      t.campaign_id === campaignId &&
      table("team_members").some((m) => m.team_id === t.id && m.user_id === userId)
  );
}

/** Guard an insert per table (called before the row is pushed). */
function violatesInsertRule(t: string, row: Row): Err {
  if (t === "campaigns") {
    return validateCampaignRow(row);
  }
  if (t === "applications") {
    const c = campaignOf(row.campaign_id);
    if (!c) return { message: "campaign not found", code: "23503" };
    // a suspended NGO's operation is taken down — no new applications flow in
    const owner = table("profiles").find((p) => p.id === c.ngo_id);
    if (owner?.suspended) return { message: "NGO_SUSPENDED", code: "42501" };
    // invite-only campaigns are joined through campaign_invites, not open applications
    if (c.type === "invite") {
      const hasAcceptedInvite = table("campaign_invites").some(
        (ci) =>
          ci.campaign_id === row.campaign_id &&
          ci.volunteer_id === row.volunteer_id &&
          ci.status === "accepted"
      );
      if (!hasAcceptedInvite) {
        return { message: "APPLICATION_REQUIRES_INVITE", code: "23514" };
      }
    }
  }
  if (t === "team_members") {
    const team = table("teams").find((x) => x.id === row.team_id);
    const c = campaignOf(team?.campaign_id);
    if (!team || !c) return { message: "TEAM_NOT_FOUND", code: "23503" };
    if (row.member_type === "staff") {
      const activeStaff = table("ngo_staff").some(
        (s) => s.ngo_id === c.ngo_id && s.profile_id === row.user_id && s.status === "active"
      );
      if (!activeStaff) return { message: "STAFF_MUST_BE_ACTIVE_FOR_NGO", code: "23514" };
    } else {
      const accepted =
        table("applications").some(
          (a) =>
            a.campaign_id === c.id && a.volunteer_id === row.user_id && a.status === "accepted"
        ) ||
        table("campaign_invites").some(
          (ci) =>
            ci.campaign_id === c.id && ci.volunteer_id === row.user_id && ci.status === "accepted"
        );
      if (!accepted) return { message: "VOLUNTEER_MUST_BE_ACCEPTED", code: "23514" };
    }
  }
  if (t === "ratings") {
    if (row.from_user_id === row.to_user_id) {
      return { message: "NO_SELF_RATING", code: "23514" };
    }
    const score = Number(row.score);
    if (!Number.isInteger(score) || score < 1 || score > 5) {
      return { message: "RATING_SCORE_RANGE", code: "23514" };
    }
    const c = campaignOf(row.campaign_id);
    if (!c || c.status !== "completed") {
      return { message: "RATING_REQUIRES_COMPLETED_CAMPAIGN", code: "23514" };
    }
    // each side must be on the campaign team or be the campaign's NGO owner
    // (volunteers rate the NGO and vice versa — neither is a team_members row)
    const participant = (id: unknown) =>
      id === c.ngo_id || isCampaignTeamMember(row.campaign_id, id);
    if (!participant(row.from_user_id) || !participant(row.to_user_id)) {
      return { message: "RATING_REQUIRES_SHARED_TEAM", code: "23514" };
    }
  }
  return null;
}

/** Guard an update per table (called before each matched row is mutated). */
function violatesUpdateRule(t: string, before: Row, values: Row): Err {
  if (t === "fund_allocations") {
    if (values.amount != null && Number(values.amount) !== Number(before.amount)) {
      return { message: "FUND_AMOUNT_IMMUTABLE", code: "23514" };
    }
    if (
      (values.member_id != null && values.member_id !== before.member_id) ||
      (values.campaign_id != null && values.campaign_id !== before.campaign_id)
    ) {
      return { message: "FUND_TARGET_IMMUTABLE", code: "23514" };
    }
    if (before.status === "paid" && values.status === "pending") {
      return { message: "FUND_ALREADY_PAID", code: "23514" };
    }
  }
  if (t === "campaign_invites") {
    if (
      (values.campaign_id != null && values.campaign_id !== before.campaign_id) ||
      (values.volunteer_id != null && values.volunteer_id !== before.volunteer_id) ||
      (values.invited_by != null && values.invited_by !== before.invited_by)
    ) {
      return { message: "INVITE_TARGET_IMMUTABLE", code: "23514" };
    }
    if (values.status != null && values.status !== before.status) {
      if (before.status !== "pending") {
        return { message: "INVITE_ALREADY_ANSWERED", code: "23514" };
      }
      if (values.status !== "accepted" && values.status !== "declined") {
        return { message: "INVITE_STATUS_INVALID", code: "23514" };
      }
    }
  }
  if (t === "team_members") {
    if (
      (values.team_id != null && values.team_id !== before.team_id) ||
      (values.user_id != null && values.user_id !== before.user_id) ||
      (values.member_type != null && values.member_type !== before.member_type)
    ) {
      return { message: "TEAM_MEMBER_IMMUTABLE", code: "23514" };
    }
    if (values.hours_logged != null && values.hours_logged !== before.hours_logged) {
      const hours = Number(values.hours_logged);
      if (!Number.isFinite(hours) || hours < 0) {
        return { message: "HOURS_NEGATIVE", code: "23514" };
      }
      const team = table("teams").find((x) => x.id === before.team_id);
      const c = campaignOf(team?.campaign_id);
      if (!c || c.status !== "completed") {
        return { message: "HOURS_ONLY_AFTER_COMPLETION", code: "23514" };
      }
    }
  }
  if (t === "campaigns") {
    const merged = { ...before, ...values };
    const dateErr = validateCampaignRow(merged);
    if (dateErr) return dateErr;
    // total_budget cannot drop below what is already allocated
    if (values.total_budget != null) {
      const allocated = table("fund_allocations")
        .filter((f) => f.campaign_id === before.id)
        .reduce((s, f) => s + Number(f.amount ?? 0), 0);
      if (Number(values.total_budget) - allocated < 0) {
        return { message: "TOTAL_BELOW_ALLOCATED", code: "23514" };
      }
    }
  }
  return null;
}

/** Unique partial indexes that the UI depends on for duplicate messages. */
function violatesUnique(t: string, row: Row): Err {
  const rows = table(t);
  if (t === "applications" && (row.status === "pending" || row.status === "accepted")) {
    const dup = rows.some(
      (r) => r.volunteer_id === row.volunteer_id && r.campaign_id === row.campaign_id &&
        (r.status === "pending" || r.status === "accepted")
    );
    if (dup) return { message: "duplicate key value violates unique constraint \"applications_active_unique\"", code: "23505" };
  }
  if (t === "campaign_invites" && row.status === "pending") {
    const dup = rows.some(
      (r) => r.campaign_id === row.campaign_id && r.volunteer_id === row.volunteer_id && r.status === "pending"
    );
    if (dup) return { message: "duplicate key value violates unique constraint \"campaign_invites_pending_unique\"", code: "23505" };
  }
  if (t === "team_members") {
    const dup = rows.some((r) => r.team_id === row.team_id && r.user_id === row.user_id);
    if (dup) return { message: "duplicate key value violates unique constraint \"team_members_unique\"", code: "23505" };
  }
  if (t === "chat_room_members") {
    const dup = rows.some((r) => r.room_id === row.room_id && r.user_id === row.user_id);
    if (dup) return { message: "duplicate key value violates unique constraint \"chat_room_members_unique\"", code: "23505" };
  }
  if (t === "ratings") {
    const dup = rows.some(
      (r) => r.campaign_id === row.campaign_id && r.from_user_id === row.from_user_id && r.to_user_id === row.to_user_id
    );
    if (dup) return { message: "duplicate key value violates unique constraint \"ratings_unique\"", code: "23505" };
  }
  return null;
}

function resyncBudget(campaignId: unknown): void {
  const c = table("campaigns").find((r) => r.id === campaignId);
  if (!c) return;
  const allocated = table("fund_allocations")
    .filter((f) => f.campaign_id === campaignId)
    .reduce((s, f) => s + Number(f.amount ?? 0), 0);
  c.remaining_budget = Number(c.total_budget ?? 0) - allocated;
}

function recomputeAvgRating(targetId: unknown): void {
  const profile = table("profiles").find((p) => p.id === targetId);
  if (!profile) return;
  const rs = table("ratings").filter((r) => r.to_user_id === targetId);
  const avg = rs.length ? rs.reduce((s, r) => s + Number(r.score ?? 0), 0) / rs.length : 0;
  const rounded = Math.round(avg * 100) / 100;
  if (profile.role === "ngo") {
    const ngo = table("ngos").find((n) => n.profile_id === targetId);
    if (ngo) ngo.avg_rating = rounded;
  } else if (profile.role === "volunteer") {
    const v = table("volunteers").find((v) => v.profile_id === targetId);
    if (v) v.avg_rating = rounded;
  }
}

/** The after-insert side effects (notification triggers + aggregates). */
function afterInsert(t: string, row: Row): void {
  switch (t) {
    case "campaign_invites":
      notify(row.volunteer_id, "campaign_invite", `You have been invited to join "${campaignTitle(row.campaign_id)}".`);
      break;
    case "applications": {
      // new pending application → the campaign's NGO owner wants to know (end-to-end flow)
      if (row.status === "pending") {
        const campaign = table("campaigns").find((c) => c.id === row.campaign_id);
        if (campaign) {
          notify(
            campaign.ngo_id,
            "new_application",
            `${profileName(row.volunteer_id)} applied to join "${campaignTitle(row.campaign_id)}".`
          );
        }
      }
      break;
    }
    case "volunteer_reports": {
      // every admin sees new reports in their review queue
      for (const p of table("profiles")) {
        if (p.role === "admin") {
          notify(
            p.id,
            "volunteer_report",
            `A report was filed against ${profileName(row.volunteer_id)} by ${profileName(row.reported_by)}.`
          );
        }
      }
      break;
    }
    case "team_members": {
      const team = table("teams").find((x) => x.id === row.team_id);
      notify(row.user_id, "team_assignment", `You have been added to the team for "${campaignTitle(team?.campaign_id)}".`);
      break;
    }
    case "fund_allocations": {
      if (Number(row.amount) <= 0) return;
      notify(
        row.member_id,
        "fund_allocation",
        `A fund allocation of Rs. ${row.amount} was recorded for you in "${campaignTitle(row.campaign_id)}".`
      );
      resyncBudget(row.campaign_id);
      break;
    }
    case "messages": {
      const room = table("chat_rooms").find((r) => r.id === row.room_id);
      const roomName = String(room?.name ?? "a room");
      for (const m of table("chat_room_members")) {
        if (m.room_id === row.room_id && m.user_id !== row.sender_id) {
          notify(m.user_id, "chat_message", `New message in "${roomName}".`);
        }
      }
      if (room) {
        const campaign = table("campaigns").find((c) => c.id === room.campaign_id);
        const owner = campaign?.ngo_id;
        const ownerIsMember = owner &&
          table("chat_room_members").some((m) => m.room_id === row.room_id && m.user_id === owner);
        if (owner && owner !== row.sender_id && !ownerIsMember) {
          notify(owner, "chat_message", `New message in "${roomName}".`);
        }
      }
      break;
    }
    case "ngo_staff": {
      const invitee = findProfileByEmail(String(row.invited_email ?? ""));
      if (invitee) notify(invitee.id, "staff_invite", "You have been invited to join an NGO on Sanjivani as a staff member.");
      break;
    }
    case "ratings":
      recomputeAvgRating(row.to_user_id);
      notify(
        row.to_user_id,
        "rating_received",
        `You received a ${row.score}-star rating on "${campaignTitle(row.campaign_id)}".`
      );
      break;
    default:
      break;
  }
}

/** The after-update side effects. */
function afterUpdate(t: string, before: Row, after: Row): void {
  switch (t) {
    case "campaigns": {
      // status lifecycle → every team member learns the campaign moved,
      // and completion unlocks ratings + hours for them
      if (before.status !== after.status) {
        const extra =
          after.status === "completed"
            ? " You can now rate your teammates and the NGO."
            : after.status === "cancelled"
              ? " No further activity can happen on it."
              : "";
        for (const uid of campaignMemberIds(after.id)) {
          notify(uid, "campaign_status", `"${after.title}" is now ${after.status}.${extra}`);
        }
      }
      break;
    }
    case "applications":
      if (before.status !== after.status && (after.status === "accepted" || after.status === "rejected")) {
        notify(
          after.volunteer_id,
          "application_status",
          `Your application for "${campaignTitle(after.campaign_id)}" was ${after.status}.`
        );
      }
      break;
    case "campaign_invites": {
      // invite answered — the NGO learns about declines; accepts are visible
      // through the applications row the API route creates
      if (before.status !== after.status && after.status === "declined") {
        notify(
          after.invited_by,
          "invite_declined",
          `${profileName(after.volunteer_id)} declined the invite to "${campaignTitle(after.campaign_id)}".`
        );
      }
      break;
    }
    case "volunteer_reports":
      if (before.status !== after.status && (after.status === "reviewed" || after.status === "dismissed")) {
        notify(
          after.reported_by,
          "report_status",
          `Your report against ${profileName(after.volunteer_id)} was marked ${after.status}.`
        );
      }
      break;
    case "team_members":
      if (Number(after.hours_logged ?? 0) !== Number(before.hours_logged ?? 0)) {
        const team = table("teams").find((x) => x.id === after.team_id);
        notify(
          after.user_id,
          "hours_logged",
          `${after.hours_logged} hour${Number(after.hours_logged) === 1 ? "" : "s"} were logged for you on "${campaignTitle(team?.campaign_id)}".`
        );
      }
      break;
    case "profiles":
      if (before.suspended !== after.suspended) {
        notify(
          after.id,
          after.suspended ? "account_suspended" : "account_unsuspended",
          after.suspended
            ? "Your account was suspended by the platform admin. Your data is preserved — contact support if you think this is a mistake."
            : "Your account was unsuspended — welcome back. All your data is intact."
        );
      }
      break;
    case "fund_allocations":
      if (before.status === "pending" && after.status === "paid") {
        notify(after.member_id, "fund_paid", `Your fund allocation of Rs. ${after.amount} has been marked paid.`);
      }
      resyncBudget(after.campaign_id);
      break;
    case "ngos":
      if (before.verification_status !== after.verification_status &&
          (after.verification_status === "approved" || after.verification_status === "rejected")) {
        notify(after.profile_id, "ngo_verification", `Your NGO "${after.org_name}" was ${after.verification_status}.`);
      }
      break;
    case "volunteers":
      if (before.verification_status !== after.verification_status &&
          (after.verification_status === "approved" || after.verification_status === "rejected")) {
        notify(after.profile_id, "volunteer_verification", `Your volunteer verification was ${after.verification_status}.`);
      }
      break;
    case "ngo_staff":
      if (after.profile_id && !before.profile_id) {
        notify(after.ngo_id, "staff_claimed", `${after.invited_name ?? after.invited_email} has claimed their staff invite.`);
      }
      break;
    default:
      break;
  }
}

// ---------------------------------------------------------------- executor

const STATUS_DEFAULTS: Record<string, string> = {
  applications: "pending",
  campaign_invites: "pending",
  fund_allocations: "pending",
  ngo_staff: "invited",
  volunteer_reports: "open",
};

const CREATED_AT_TABLES = new Set([
  "profiles",
  "ngo_staff",
  "campaigns",
  "volunteer_reports",
  "applications",
  "campaign_invites",
  "fund_allocations",
  "chat_rooms",
  "messages",
  "notifications",
  "ratings",
]);

export function execute(op: DemoOp): PostgrestLike<unknown> {
  try {
    switch (op.t) {
      case "select":
        return runSelect(op.table, op.columns, op.filters, op.order, op);
      case "insert":
        return runInsert(op.table, op.values, op.columns, op.single);
      case "update":
        return runUpdate(op.table, op.values, op.filters, op.columns, op.single);
      case "delete":
        return runDelete(op.table, op.filters, op.columns);
      case "rpc":
        return runRpc(op.fn, op.args);
      default:
        return err("demo: unsupported operation", "0A000");
    }
  } catch (e) {
    return err(e instanceof Error ? e.message : "demo engine error", "XX000", 500);
  }
}

function resolveParsed(tableRows: Row[], t: string, columns: string) {
  const parsed = parseSelect(columns || "*", t);
  return tableRows.map((r) => resolveRow(r, t, parsed));
}

function runSelect(
  t: string,
  columns: string,
  filters: Filter[],
  order: OrderClause[],
  op: { limit?: number; single?: boolean; maybe?: boolean; count?: "exact"; head?: boolean }
): PostgrestLike<unknown> {
  if (!getStore().tables[t]) return err(`relation "public.${t}" does not exist`, "42P01", 404);
  let rows = applyFilters(table(t), filters);
  const total = rows.length;
  rows = applyOrder(rows, order);
  if (op.limit != null) rows = rows.slice(0, op.limit);
  if (op.head && op.count) {
    return ok(null, { count: total });
  }
  const data = resolveParsed(rows, t, columns);
  if (op.single) {
    if (data.length === 0) {
      // maybeSingle → { data: null, error: null }; single → PGRST116 error
      return op.maybe ? ok(null) : err("JSON object requested, multiple (or no) rows returned", "PGRST116", 406);
    }
    if (data.length > 1) return err("JSON object requested, multiple (or no) rows returned", "PGRST116", 406);
    return ok(data[0], { count: op.count ? total : null });
  }
  return ok(data, { count: op.count === "exact" ? total : null });
}

function runInsert(t: string, values: Row[], columns?: string, single?: boolean): PostgrestLike<unknown> {
  if (!getStore().tables[t]) return err(`relation "public.${t}" does not exist`, "42P01", 404);
  const inserted: Row[] = [];
  for (const raw of values) {
    const row: Row = { ...raw };
    if (DEFAULT_ID_TABLES.has(t) && row.id == null) row.id = randomUUID();
    if (CREATED_AT_TABLES.has(t) && row.created_at == null) row.created_at = new Date().toISOString();
    if (row.status == null && STATUS_DEFAULTS[t]) row.status = STATUS_DEFAULTS[t];
    if (t === "notifications" && row.read == null) row.read = false;
    if (t === "campaigns") row.remaining_budget = row.total_budget ?? 0;

    const dup = violatesUnique(t, row);
    if (dup) return err(dup.message, dup.code, 409);

    const rule = violatesInsertRule(t, row);
    if (rule) return err(rule.message, rule.code, 400);

    // budget guard (mirrors validate_fund_amount)
    if (t === "fund_allocations") {
      const c = table("campaigns").find((x) => x.id === row.campaign_id);
      if (!c) return err("campaign not found", "23503", 409);
      if (Number(row.amount) <= 0) return err("FUND_AMOUNT_POSITIVE", "23514", 400);
      if (Number(row.amount) > Number(c.remaining_budget ?? 0)) {
        return err("FUND_EXCEEDS_REMAINING", "23514", 400);
      }
    }

    table(t).push(row);
    afterInsert(t, row);
    inserted.push(row);
  }
  if (columns) {
    const data = resolveParsed(inserted, t, columns);
    return ok(single ? (data[0] ?? null) : data);
  }
  return ok(null);
}

function runUpdate(
  t: string,
  values: Row,
  filters: Filter[],
  columns?: string,
  single?: boolean
): PostgrestLike<unknown> {
  if (!getStore().tables[t]) return err(`relation "public.${t}" does not exist`, "42P01", 404);
  const rows = applyFilters(table(t), filters);
  if (rows.length === 0) return err("No rows found to update", "PGRST116", 406);
  const updated: Row[] = [];
  for (const row of rows) {
    const before = { ...row };
    const rule = violatesUpdateRule(t, before, values);
    if (rule) return err(rule.message, rule.code, 400);
    Object.assign(row, values);
    if (t === "campaigns") resyncBudget(row.id);
    afterUpdate(t, before, row);
    updated.push(row);
  }
  if (columns) {
    const data = resolveParsed(updated, t, columns);
    return ok(single ? (data[0] ?? null) : data);
  }
  return ok(null);
}

function runDelete(t: string, filters: Filter[], columns?: string): PostgrestLike<unknown> {
  if (!getStore().tables[t]) return err(`relation "public.${t}" does not exist`, "42P01", 404);
  const rows = applyFilters(table(t), filters);
  const store = getStore();
  store.tables[t] = table(t).filter((r) => !rows.includes(r));
  if (t === "ratings") {
    for (const r of rows) recomputeAvgRating(r.to_user_id);
  }
  if (t === "fund_allocations") {
    for (const r of rows) resyncBudget(r.campaign_id);
  }
  if (t === "team_members") {
    // removal from a team is something the member deserves to know about
    for (const r of rows) {
      const team = table("teams").find((x) => x.id === r.team_id);
      notify(
        r.user_id,
        "team_removed",
        `You were removed from the team for "${campaignTitle(team?.campaign_id)}".`
      );
    }
  }
  if (columns) return ok(resolveParsed(rows, t, columns));
  return ok(null);
}

function runRpc(fn: string, args: Record<string, unknown>): PostgrestLike<unknown> {
  if (fn === "volunteer_total_hours") {
    const hours = table("team_members")
      .filter((m) => m.user_id === args.p_volunteer_id)
      .reduce((s, m) => s + Number(m.hours_logged ?? 0), 0);
    return ok(hours);
  }
  return err(`function public.${fn} does not exist`, "42883", 404);
}
