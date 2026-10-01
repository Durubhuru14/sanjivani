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

function findProfileByEmail(email: string): Row | null {
  const u = getStore().users.find((x) => x.email.toLowerCase() === email.toLowerCase());
  if (!u) return null;
  return table("profiles").find((p) => p.id === u.id) ?? null;
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
      break;
    default:
      break;
  }
}

/** The after-update side effects. */
function afterUpdate(t: string, before: Row, after: Row): void {
  switch (t) {
    case "applications":
      if (before.status !== after.status && (after.status === "accepted" || after.status === "rejected")) {
        notify(
          after.volunteer_id,
          "application_status",
          `Your application for "${campaignTitle(after.campaign_id)}" was ${after.status}.`
        );
      }
      break;
    case "campaign_invites":
      // invite accepted → the accepting volunteer may need a team row; app handles that itself
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
