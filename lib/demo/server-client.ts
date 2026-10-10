/**
 * Demo mode — server-side client factory (SERVER ONLY).
 * Executes directly against the in-memory store and reads the demo
 * session cookie through next/headers, mirroring the @supabase/ssr
 * server client contract the app already uses.
 */
import { cookies } from "next/headers";
import { makeClient, type DemoAuth, type DemoClient } from "./client";
import { execute } from "./engine";
import { DEMO_COOKIE, demoActive } from "./flag";
import { getStore, type DemoUser } from "./store";
import { publicUser } from "./session";
import type { DemoOp } from "./types";

function userById(id: string | undefined): DemoUser | null {
  if (!id) return null;
  return getStore().users.find((u) => u.id === id) ?? null;
}

function makeServerAuth(): DemoAuth {
  const readCookie = async () => (await cookies()).get(DEMO_COOKIE)?.value;

  const setUserCookie = async (id: string) => {
    try {
      const store = await cookies();
      store.set(DEMO_COOKIE, id, {
        path: "/",
        maxAge: 60 * 60 * 24 * 7,
        sameSite: "lax",
      });
    } catch {
      // called from a Server Component — API routes set cookies instead
    }
  };

  return {
    getUser: async () => {
      const user = userById(await readCookie());
      return { data: { user: publicUser(user) as unknown as DemoUser | null }, error: null };
    },
    getSession: async () => {
      const user = userById(await readCookie());
      return { data: { session: user ? { user: publicUser(user) } : null }, error: null };
    },
    signInWithPassword: async (creds) => {
      const u = getStore().users.find(
        (x) => x.email.toLowerCase() === creds.email.trim().toLowerCase()
      );
      if (!u || u.password !== creds.password) {
        return { data: { user: null, session: null }, error: { message: "Invalid login credentials" } };
      }
      await setUserCookie(u.id);
      return { data: { user: publicUser(u) as unknown as DemoUser, session: { user: publicUser(u) } }, error: null };
    },
    signUp: async (creds) => {
      const exists = getStore().users.some(
        (x) => x.email.toLowerCase() === creds.email.trim().toLowerCase()
      );
      if (exists) {
        return { data: { user: null, session: null }, error: { message: "User already registered" } };
      }
      const user: DemoUser = {
        id: crypto.randomUUID(),
        email: creds.email.trim().toLowerCase(),
        password: creds.password,
        created_at: new Date().toISOString(),
      };
      getStore().users.push(user);
      await setUserCookie(user.id);
      return { data: { user: publicUser(user) as unknown as DemoUser, session: { user: publicUser(user) } }, error: null };
    },
    signOut: async () => {
      try {
        (await cookies()).delete(DEMO_COOKIE);
      } catch {
        // server components can't mutate cookies; API routes handle it
      }
      return { error: null };
    },
    onAuthStateChange: (cb) => {
      setTimeout(() => cb("INITIAL_SESSION", null), 0);
      return { data: { subscription: { unsubscribe: () => undefined } } };
    },
    admin: {
      getUserById: async (id: string) => {
        const u = userById(id);
        return { data: { user: publicUser(u) as unknown as DemoUser | null }, error: null };
      },
      deleteUser: async () => ({ data: { user: null }, error: null }),
    },
  };
}

/** The server-scope demo client (server components / API routes / actions). */
export function createDemoServerClient(): DemoClient {
  if (!demoActive) {
    throw new Error("createDemoServerClient called while Supabase is configured");
  }
  const transport = (op: DemoOp) => Promise.resolve(execute(op));
  return makeClient(transport, makeServerAuth());
}
