/**
 * Demo mode — shared operation types (client + server safe).
 *
 * When no Supabase env is configured the app runs against an in-memory,
 * seeded store (see lib/demo/store.ts). Client-side queries are serialised
 * into these plain-JS operation objects and executed by POST /api/demo,
 * so the server store stays the single source of truth for every browser.
 */

export type FilterOp = "eq" | "neq" | "in" | "ilike" | "like" | "gt" | "gte" | "lt" | "lte" | "or" | "is";

export interface Filter {
  op: FilterOp;
  col: string;
  /** scalar for eq/neq/ilike…, array for `in`, PostgREST string for `or` */
  val: unknown;
}

export interface OrderClause {
  col: string;
  asc: boolean;
}

export interface SelectOp {
  t: "select";
  table: string;
  columns: string;
  filters: Filter[];
  order: OrderClause[];
  limit?: number;
  single?: boolean;
  maybe?: boolean;
  count?: "exact";
  head?: boolean;
}

export interface InsertOp {
  t: "insert";
  table: string;
  values: Record<string, unknown>[];
  columns?: string;
  single?: boolean;
}

export interface UpdateOp {
  t: "update";
  table: string;
  values: Record<string, unknown>;
  filters: Filter[];
  columns?: string;
  single?: boolean;
}

export interface DeleteOp {
  t: "delete";
  table: string;
  filters: Filter[];
  columns?: string;
}

export interface RpcOp {
  t: "rpc";
  fn: string;
  args: Record<string, unknown>;
}

export type DemoOp = SelectOp | InsertOp | UpdateOp | DeleteOp | RpcOp;

/** The shape every supabase-js call site already expects. */
export interface PostgrestLike<T = unknown> {
  data: T | null;
  error: { message: string; code?: string } | null;
  count: number | null;
  status: number;
  statusText: string;
}
