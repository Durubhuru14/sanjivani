/**
 * Demo mode — query engine (SERVER ONLY).
 *
 * A deliberately SMALL in-memory stand-in for PostgREST: just enough for
 * every page to render and the main writes to round-trip while clicking
 * around the demo (`npm run demo`). It is EPHEMERAL — the store lives in
 * the server process and resets on restart — and intentionally NOT a
 * faithful copy of the real backend:
 *
 *   - No business-rule trigger emulation. Rules (unique applications,
 *     immutable funds, invite-only joins, rating eligibility, …) are
 *     enforced by the Postgres triggers in supabase/migrations/ and only
 *     exist in a real deployment. Demo mode accepts writes permissively.
 *   - Notification fan-out is a curated SUBSET of the live triggers — the
 *     loops a demo click-through actually closes (application decisions,
 *     invites, team changes, campaign status, ratings, funds, reports,
 *     verification, suspension, staff claims, chat). Messages mirror the
 *     live trigger strings so the bell behaves like production.
 *   - The maintained aggregates are the ones the UI displays live:
 *     `campaigns.remaining_budget` and the `avg_rating` columns.
 *
 * Supported: filters (eq/neq/in/ilike/like/gt/gte/lt/lte/or/is), ordering,
 * limit, single/maybeSingle, exact counts, FK embed resolution, and
 * insert/update/delete with the column defaults the app relies on.
 */
import { randomUUID } from "node:crypto";
import { resolveRelation } from "./relations";
import { DEFAULT_ID_TABLES, getStore, type Row } from "./store";
import type { DemoOp, Filter, OrderClause, PostgrestLike } from "./types";

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

// ------------------------------------------------------- display aggregates
// The trigger behaviour kept beyond notifications: the two numbers the UI
// shows live, so a click-through never displays stale math. Everything else
// is permissive.

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

// ------------------------------------------------------ demo notifications
// A curated subset of the live triggers (supabase/migrations/00004 + 00007):
// the notification loops a demo click-through closes. Messages mirror the
// live trigger strings so the bell behaves like production. Recipients
// without a profile row are skipped, exactly like notify_user's null guard.

function notify(userId: unknown, type: string, message: string): void {
  if (typeof userId !== "string" || !userId) return;
  table("notifications").push({
    id: randomUUID(),
    user_id: userId,
    type,
    message,
    read: false,
    created_at: new Date().toISOString(),
  });
}

function profileName(id: unknown): string {
  const p = table("profiles").find((r) => r.id === id);
  return typeof p?.name === "string" ? p.name : "Someone";
}

function campaignTitle(campaignId: unknown): string {
  const c = table("campaigns").find((r) => r.id === campaignId);
  return typeof c?.title === "string" ? c.title : "a campaign";
}

function teamCampaignId(teamId: unknown): unknown {
  const t = table("teams").find((r) => r.id === teamId);
  return t?.campaign_id;
}

/** after-insert notification hooks (mirror of the live triggers). */
function afterInsertNotify(t: string, row: Row): void {
  if (t === "applications" && row.status === "pending") {
    const c = table("campaigns").find((r) => r.id === row.campaign_id);
    if (c?.ngo_id) {
      notify(
        c.ngo_id,
        "new_application",
        `${profileName(row.volunteer_id)} applied to join "${campaignTitle(row.campaign_id)}".`
      );
    }
  } else if (t === "campaign_invites") {
    notify(
      row.volunteer_id,
      "campaign_invite",
      `You have been invited to join "${campaignTitle(row.campaign_id)}".`
    );
  } else if (t === "team_members") {
    notify(
      row.user_id,
      "team_assignment",
      `You have been added to the team for "${campaignTitle(teamCampaignId(row.team_id))}".`
    );
  } else if (t === "ratings") {
    notify(
      row.to_user_id,
      "rating_received",
      `You received a ${row.score}-star rating on "${campaignTitle(row.campaign_id)}".`
    );
  } else if (t === "volunteer_reports") {
    const msg = `A report was filed against ${profileName(row.volunteer_id)} by ${profileName(row.reported_by)}.`;
    for (const p of table("profiles")) {
      if (p.role === "admin") notify(p.id, "volunteer_report", msg);
    }
  } else if (t === "fund_allocations") {
    notify(
      row.member_id,
      "fund_allocation",
      `A fund allocation of Rs. ${row.amount} was recorded for you in "${campaignTitle(row.campaign_id)}".`
    );
  } else if (t === "messages") {
    const room = table("chat_rooms").find((r) => r.id === row.room_id);
    const msg = `New message in "${room?.name ?? "a room"}."`;
    const members = new Set(
      table("chat_room_members")
        .filter((m) => m.room_id === row.room_id)
        .map((m) => m.user_id)
    );
    for (const uid of members) {
      if (uid !== row.sender_id) notify(uid, "chat_message", msg);
    }
    if (room?.campaign_id) {
      const c = table("campaigns").find((r) => r.id === room.campaign_id);
      if (c?.ngo_id && !members.has(c.ngo_id)) notify(c.ngo_id, "chat_message", msg);
    }
  }
}

/** after-update notification hooks. `before` is the pre-update row snapshot. */
function afterUpdateNotify(t: string, before: Row, row: Row): void {
  if (t === "applications" && before.status !== row.status) {
    notify(
      row.volunteer_id,
      "application_status",
      `Your application for "${campaignTitle(row.campaign_id)}" was ${row.status}.`
    );
  } else if (t === "campaign_invites" && before.status !== row.status) {
    if (row.status === "declined") {
      notify(
        row.invited_by,
        "invite_declined",
        `${profileName(row.volunteer_id)} declined the invite to "${campaignTitle(row.campaign_id)}".`
      );
    } else if (row.status === "accepted") {
      notify(
        row.invited_by,
        "invite_accepted",
        `${profileName(row.volunteer_id)} accepted the invite to "${campaignTitle(row.campaign_id)}".`
      );
    }
  } else if (t === "campaigns" && before.status !== row.status) {
    let extra = "";
    if (row.status === "completed") extra = " You can now rate your teammates and the NGO.";
    else if (row.status === "cancelled") extra = " No further activity can happen on it.";
    const msg = `"${row.title}" is now ${row.status}.${extra}`;
    for (const tm of table("team_members")) {
      const cid = teamCampaignId(tm.team_id);
      if (cid === row.id) notify(tm.user_id, "campaign_status", msg);
    }
  } else if (t === "team_members" && before.hours_logged !== row.hours_logged) {
    const hours = Number(row.hours_logged ?? 0);
    notify(
      row.user_id,
      "hours_logged",
      `${hours} hour${hours === 1 ? "" : "s"} were logged for you on "${campaignTitle(teamCampaignId(row.team_id))}".`
    );
  } else if (t === "volunteer_reports" && before.status !== row.status &&
      (row.status === "reviewed" || row.status === "dismissed")) {
    notify(
      row.reported_by,
      "report_status",
      `Your report against ${profileName(row.volunteer_id)} was marked ${row.status}.`
    );
  } else if (t === "profiles" && before.suspended !== row.suspended) {
    notify(
      row.id,
      row.suspended ? "account_suspended" : "account_unsuspended",
      row.suspended
        ? "Your account was suspended by the platform admin. Your data is preserved — contact support if you think this is a mistake."
        : "Your account was unsuspended — welcome back. All your data is intact."
    );
  } else if (t === "ngos" && before.verification_status !== row.verification_status) {
    notify(
      row.profile_id,
      "ngo_verification",
      `Your NGO "${row.org_name}" was ${row.verification_status}.`
    );
  } else if (t === "volunteers" && before.verification_status !== row.verification_status) {
    notify(
      row.profile_id,
      "volunteer_verification",
      `Your volunteer verification was ${row.verification_status}.`
    );
  } else if (t === "ngo_staff" && before.profile_id == null && row.profile_id != null) {
    notify(
      row.ngo_id,
      "staff_claimed",
      `${row.invited_name ?? row.invited_email} has claimed their staff invite.`
    );
  } else if (t === "fund_allocations" && before.status !== row.status && row.status === "paid") {
    notify(
      row.member_id,
      "fund_paid",
      `Your fund allocation of Rs. ${row.amount} has been marked paid.`
    );
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
        return runUpdate(op.table, op.values, op.filters, op.columns, op.single, op.maybe);
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

    table(t).push(row);
    if (t === "fund_allocations") resyncBudget(row.campaign_id);
    if (t === "ratings") recomputeAvgRating(row.to_user_id);
    afterInsertNotify(t, row);
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
  single?: boolean,
  maybe?: boolean
): PostgrestLike<unknown> {
  if (!getStore().tables[t]) return err(`relation "public.${t}" does not exist`, "42P01", 404);
  const rows = applyFilters(table(t), filters);
  // PostgREST semantics: a zero-row UPDATE is a quiet success (200 + empty
  // representation), not an error — only .single() turns it into PGRST116
  // (.maybeSingle() stays null-quiet). Matching that keeps demo behaviour
  // honest for idempotent retries (mark-all-read, double-clicked status
  // buttons, fund re-syncs) and for existence checks that read the update's
  // returned row.
  if (rows.length === 0) {
    if (single && !maybe) return err("JSON object requested, multiple (or no) rows returned", "PGRST116", 406);
    return columns ? ok(single ? null : []) : ok(null);
  }
  const updated: Row[] = [];
  for (const row of rows) {
    const before = { ...row };
    Object.assign(row, values);
    if (t === "campaigns") resyncBudget(row.id);
    if (t === "fund_allocations") resyncBudget(row.campaign_id);
    afterUpdateNotify(t, before, row);
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
    // removal notification — the member deserves to know (live trigger 00007)
    for (const r of rows) {
      notify(
        r.user_id,
        "team_removed",
        `You were removed from the team for "${campaignTitle(teamCampaignId(r.team_id))}".`
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
