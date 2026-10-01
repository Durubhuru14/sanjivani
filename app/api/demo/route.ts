import { NextRequest, NextResponse } from "next/server";
import { execute } from "@/lib/demo/engine";
import { DEMO_COOKIE, demoActive } from "@/lib/demo/flag";
import { getStore } from "@/lib/demo/store";
import { publicUser } from "@/lib/demo/session";
import type { DemoOp } from "@/lib/demo/types";

/**
 * Demo mode transport (only active when no Supabase env is configured).
 *
 * POST — browser queries: { kind: "query", op } executes a PostgREST-shaped
 *        operation against the in-memory store, and the auth-* kinds drive
 *        the demo cookie session (login / logout / session / signup).
 * GET  — middleware guard: /api/demo?uid=… returns the profile context
 *        (role, suspension, NGO verification) for the route guards.
 *
 * This route is intentionally inert once real Supabase env vars exist.
 */

const JSON_HEADERS = { "content-type": "application/json" };

function findUser(id: string | undefined) {
  if (!id) return null;
  return getStore().users.find((u) => u.id === id) ?? null;
}

function sessionCookie(id: string) {
  return {
    name: DEMO_COOKIE,
    value: id,
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
    sameSite: "lax" as const,
  };
}

export async function GET(req: NextRequest) {
  if (!demoActive) return NextResponse.json({ error: "demo inactive" }, { status: 404 });
  const uid = req.nextUrl.searchParams.get("uid");
  const user = findUser(uid ?? undefined);
  if (!user) return NextResponse.json({ error: "no user" }, { status: 404 });

  const profile = getStore().tables.profiles.find((p) => p.id === user.id);
  if (!profile) return NextResponse.json({ error: "no profile" }, { status: 404 });
  const ngo =
    profile.role === "ngo"
      ? getStore().tables.ngos.find((n) => n.profile_id === user.id)
      : undefined;

  return NextResponse.json(
    {
      id: user.id,
      email: user.email,
      role: profile.role,
      suspended: Boolean(profile.suspended),
      ngoStatus: ngo?.verification_status ?? null,
    },
    { headers: { "cache-control": "no-store" } }
  );
}

export async function POST(req: NextRequest) {
  if (!demoActive) return NextResponse.json({ error: "demo inactive" }, { status: 404 });

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }

  const kind = String(body.kind ?? "");

  if (kind === "query") {
    const result = execute(body.op as DemoOp);
    return NextResponse.json(result, { headers: { "cache-control": "no-store" } });
  }

  if (kind === "auth-login" || kind === "auth-signup") {
    const email = String(body.email ?? "").trim().toLowerCase();
    const password = String(body.password ?? "");
    const users = getStore().users;

    if (kind === "auth-login") {
      const user = users.find((u) => u.email.toLowerCase() === email);
      if (!user || user.password !== password) {
        return NextResponse.json(
          { error: { message: "Invalid login credentials" } },
          { status: 200, headers: JSON_HEADERS }
        );
      }
      const res = NextResponse.json({ user: publicUser(user) }, { headers: JSON_HEADERS });
      res.cookies.set(sessionCookie(user.id));
      return res;
    }

    const exists = users.some((u) => u.email.toLowerCase() === email);
    if (exists) {
      return NextResponse.json(
        { error: { message: "User already registered" } },
        { status: 200, headers: JSON_HEADERS }
      );
    }
    const user = {
      id: crypto.randomUUID(),
      email,
      password,
      created_at: new Date().toISOString(),
    };
    users.push(user);
    const res = NextResponse.json({ user: publicUser(user) }, { headers: JSON_HEADERS });
    res.cookies.set(sessionCookie(user.id));
    return res;
  }

  if (kind === "auth-session") {
    const user = findUser(req.cookies.get(DEMO_COOKIE)?.value);
    return NextResponse.json({ user: publicUser(user) }, { headers: { "cache-control": "no-store" } });
  }

  if (kind === "auth-logout") {
    const res = NextResponse.json({ ok: true }, { headers: JSON_HEADERS });
    res.cookies.set({ name: DEMO_COOKIE, value: "", path: "/", maxAge: 0 });
    return res;
  }

  return NextResponse.json({ error: "unknown kind" }, { status: 400 });
}
