/**
 * Demo mode — query engine (SERVER ONLY).
 *
 * A deliberately SMALL in-memory stand-in for PostgREST: just enough for
 * every page to render and the main writes to round-trip while clicking
 * around the demo (`npm run demo`). It is EPHEMERAL — the store lives in
 * the server process and resets on restart — and intentionally NOT a
 * faithful copy of the real backend:
 *
 *   - No trigger emulation. Business rules (unique applications, immutable
 *     funds, invite-only joins, rating eligibility, …) are enforced by the
 *     Postgres triggers in supabase/migrations/ and only exist in a real
 *     deployment. Demo mode accepts writes permissively.
 *   - No notification fan-out. The bell shows the seeded notifications plus
 *     any row the app code inserts directly.
 *   - The only maintained aggregates are the two the UI displays live:
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
// The only trigger behaviour kept: the two numbers the UI shows live, so a
// click-through never displays stale math. Everything else is permissive.

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

    table(t).push(row);
    if (t === "fund_allocations") resyncBudget(row.campaign_id);
    if (t === "ratings") recomputeAvgRating(row.to_user_id);
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
  // PostgREST semantics: a zero-row UPDATE is a quiet success (200 + empty
  // representation), not an error — only .single() turns it into PGRST116.
  // Matching that keeps demo behaviour honest for idempotent retries
  // (mark-all-read, double-clicked status buttons, fund re-syncs).
  if (rows.length === 0) {
    if (single) return err("JSON object requested, multiple (or no) rows returned", "PGRST116", 406);
    return columns ? ok([]) : ok(null);
  }
  const updated: Row[] = [];
  for (const row of rows) {
    Object.assign(row, values);
    if (t === "campaigns") resyncBudget(row.id);
    if (t === "fund_allocations") resyncBudget(row.campaign_id);
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
