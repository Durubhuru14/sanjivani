/**
 * Demo mode — Supabase-compatible client (fluent PostgREST builder).
 *
 * - `scope: "server"` / `"admin"` → executes directly against the
 *   in-memory store in this process (server components / API routes).
 * - `scope: "browser"` → serialises the operation and POSTs it to
 *   /api/demo, so every browser shares the one server-side store.
 *
 * The builder implements enough of the supabase-js surface the app
 * uses: from().select().eq()/…/order()/limit()/single()/maybeSingle(),
 * insert().select(), update(), delete(), is(), in(), rpc(), channel(),
 * removeChannel() and storage stubs.
 */
import type { DemoOp, Filter, PostgrestLike } from "./types";

type Transport = (op: DemoOp) => Promise<PostgrestLike<unknown>>;

const noChannel: unique symbol = Symbol("no-channel");

export interface DemoChannel {
  on(
    type: string,
    filter: Record<string, unknown>,
    cb: (payload: { new: Record<string, unknown> }) => void
  ): DemoChannel;
  subscribe(cb?: (status: string) => void): DemoChannel;
  unsubscribe(): DemoChannel;
  [noChannel]: true;
}

export interface DemoUser {
  id: string;
  email: string;
  user_metadata?: Record<string, unknown>;
  app_metadata?: Record<string, unknown>;
  aud?: string;
  role?: string;
  created_at?: string;
}

export interface DemoAuth {
  getUser(): Promise<{ data: { user: DemoUser | null }; error: null }>;
  getSession(): Promise<{ data: { session: unknown | null }; error: null }>;
  signInWithPassword(creds: { email: string; password: string }): Promise<{
    data: { user: DemoUser | null; session: unknown | null };
    error: { message: string; status?: number } | null;
  }>;
  signUp(creds: { email: string; password: string; options?: Record<string, unknown> }): Promise<{
    data: { user: DemoUser | null; session: unknown | null };
    error: { message: string } | null;
  }>;
  signOut(): Promise<{ error: null }>;
  onAuthStateChange(cb: (event: string, session: unknown) => void): { data: { subscription: { unsubscribe(): void } } };
  admin: {
    getUserById(id: string): Promise<{ data: { user: DemoUser | null }; error: null }>;
    deleteUser(id: string): Promise<{ data: { user: null }; error: null }>;
  };
}

export interface DemoClient {
  from(table: string): DemoBuilder;
  rpc(fn: string, args?: Record<string, unknown>): Promise<{ data: unknown; error: null }>;
  channel(name: string, opts?: Record<string, unknown>): DemoChannel;
  removeChannel(ch: DemoChannel): Promise<"closed">;
  storage: {
    from(bucket: string): {
      upload(path: string, file: unknown, opts?: Record<string, unknown>): Promise<{ data: { path: string; fullPath?: string } | null; error: null }>;
      getPublicUrl(path: string): { data: { publicUrl: string } };
    };
  };
  auth: DemoAuth;
}

// ------------------------------------------------------------------ builder

class DemoBuilder {
  private op: DemoOp;
  private transport: Transport;

  constructor(table: string, transport: Transport) {
    this.transport = transport;
    this.op = { t: "select", table, columns: "*", filters: [], order: [] };
  }

  select(columns = "*", opts?: { count?: "exact"; head?: boolean }) {
    if (this.op.t === "select") {
      this.op.columns = columns;
      if (opts?.count) this.op.count = opts.count;
      if (opts?.head) this.op.head = opts.head;
    } else if (this.op.t === "insert" || this.op.t === "update" || this.op.t === "delete") {
      this.op.columns = columns;
    }
    return this;
  }

  insert(values: Record<string, unknown> | Record<string, unknown>[]) {
    const rows = Array.isArray(values) ? values : [values];
    this.op = { t: "insert", table: (this.op as { table: string }).table, values: rows };
    return this;
  }

  update(values: Record<string, unknown>) {
    this.op = {
      t: "update",
      table: (this.op as { table: string }).table,
      values,
      filters: [],
    };
    return this;
  }

  delete() {
    this.op = { t: "delete", table: (this.op as { table: string }).table, filters: [] };
    return this;
  }

  private push(f: Filter) {
    if (this.op.t !== "select" && this.op.t !== "update" && this.op.t !== "delete") return this;
    this.op.filters.push(f);
    return this;
  }

  eq(col: string, val: unknown) { return this.push({ op: "eq", col, val }); }
  neq(col: string, val: unknown) { return this.push({ op: "neq", col, val }); }
  in(col: string, val: unknown[]) { return this.push({ op: "in", col, val }); }
  ilike(col: string, val: string) { return this.push({ op: "ilike", col, val }); }
  like(col: string, val: string) { return this.push({ op: "like", col, val }); }
  gt(col: string, val: unknown) { return this.push({ op: "gt", col, val }); }
  gte(col: string, val: unknown) { return this.push({ op: "gte", col, val }); }
  lt(col: string, val: unknown) { return this.push({ op: "lt", col, val }); }
  lte(col: string, val: unknown) { return this.push({ op: "lte", col, val }); }
  or(val: string) { return this.push({ op: "or", col: "", val }); }
  is(col: string, val: unknown) { return this.push({ op: "is", col, val }); }

  order(col: string, opts?: { ascending?: boolean; nullsFirst?: boolean; foreignTable?: string }) {
    if (this.op.t === "select") {
      this.op.order.push({ col, asc: opts?.ascending !== false });
    }
    return this;
  }

  limit(n: number) {
    if (this.op.t === "select") this.op.limit = n;
    return this;
  }

  range(from: number, to: number) {
    if (this.op.t === "select") this.op.limit = to - from + 1;
    return this;
  }

  single() {
    (this.op as { single?: boolean }).single = true;
    return this;
  }

  maybeSingle() {
    (this.op as { single?: boolean }).single = true;
    if (this.op.t === "select") this.op.maybe = true;
    return this;
  }

  /** supabase-js builders are awaitable — mirror that. */
  then<TResult1 = PostgrestLike<unknown>, TResult2 = never>(
    onfulfilled?: ((value: PostgrestLike<unknown>) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
  ): PromiseLike<TResult1 | TResult2> {
    return this.transport(this.op).then(onfulfilled ?? undefined, onrejected ?? undefined);
  }
}

// ------------------------------------------------------------------ transports

const demoFetch = async <T>(body: Record<string, unknown>): Promise<T> => {
  const res = await fetch("/api/demo", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  return (await res.json()) as T;
};

const browserTransport: Transport = async (op) =>
  demoFetch<PostgrestLike<unknown>>({ kind: "query", op });

function makeNoopChannel(): DemoChannel {
  const ch: DemoChannel = {
    on: () => ch,
    subscribe: (cb?: (status: string) => void) => {
      cb?.("SUBSCRIBED");
      return ch;
    },
    unsubscribe: () => ch,
    [noChannel]: true,
  };
  return ch;
}

export function makeClient(transport: Transport, auth: DemoAuth): DemoClient {
  const client: DemoClient = {
    from: (t: string) => new DemoBuilder(t, transport),
    rpc: async (fn: string, args: Record<string, unknown> = {}) => {
      const r = await transport({ t: "rpc", fn, args });
      return { data: r.data, error: r.error as null };
    },
    channel: (_name: string, _opts?: Record<string, unknown>) => makeNoopChannel(),
    removeChannel: async () => "closed" as const,
    storage: {
      from: () => ({
        upload: async (path: string) => ({ data: { path }, error: null }),
        getPublicUrl: (_path: string) => ({
          data: { publicUrl: "/demo-placeholder.svg" },
        }),
      }),
    },
    auth,
  };
  return client;
}

// ------------------------------------------------------------------ browser client

export function createDemoBrowserClient(): DemoClient {
  const auth: DemoAuth = {
    getUser: async () => {
      const r = await demoFetch<{ user: DemoUser | null }>({ kind: "auth-session" });
      return { data: { user: r.user ?? null }, error: null };
    },
    getSession: async () => {
      const r = await demoFetch<{ user: DemoUser | null }>({ kind: "auth-session" });
      return { data: { session: r.user ? { user: r.user } : null }, error: null };
    },
    signInWithPassword: async (creds) => {
      const r = await demoFetch<{ user?: DemoUser | null; error?: { message: string; status?: number } }>({
        kind: "auth-login",
        email: creds.email,
        password: creds.password,
      });
      if (r.error) return { data: { user: null, session: null }, error: r.error };
      return { data: { user: r.user ?? null, session: r.user ? { user: r.user } : null }, error: null };
    },
    signUp: async (creds) => {
      const r = await demoFetch<{ user?: DemoUser | null; error?: { message: string } }>({
        kind: "auth-signup",
        email: creds.email,
        password: creds.password,
      });
      if (r.error) return { data: { user: null, session: null }, error: r.error };
      return { data: { user: r.user ?? null, session: r.user ? { user: r.user } : null }, error: null };
    },
    signOut: async () => {
      await demoFetch({ kind: "auth-logout" });
      return { error: null };
    },
    onAuthStateChange: (cb) => {
      // demo mode has no realtime auth events; fire once so callers settle
      setTimeout(() => cb("INITIAL_SESSION", null), 0);
      return { data: { subscription: { unsubscribe: () => undefined } } };
    },
    admin: {
      getUserById: async () => ({ data: { user: null }, error: null }),
      deleteUser: async () => ({ data: { user: null }, error: null }),
    },
  };
  return makeClient(browserTransport, auth);
}

export { DemoBuilder };
