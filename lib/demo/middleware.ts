import { NextResponse, type NextRequest } from "next/server";
import { DEMO_COOKIE } from "./flag";
import { ROLE_HOME, PROTECTED_PREFIXES, ROLE_EXCEPTIONS } from "@/lib/supabase/middleware-roles";

/**
 * Demo mode — the same session guards as lib/supabase/middleware.ts,
 * reading the demo cookie and resolving the profile context through
 * the internal /api/demo guard endpoint so the middleware runtime
 * never has to import the in-memory store directly.
 */
interface GuardContext {
  role: string;
  suspended: boolean;
  ngoStatus: string | null;
}

async function guardContext(request: NextRequest, uid: string): Promise<GuardContext | null> {
  try {
    const res = await fetch(new URL(`/api/demo?uid=${encodeURIComponent(uid)}`, request.nextUrl.origin), {
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = (await res.json()) as Partial<GuardContext>;
    if (!data.role) return null;
    return {
      role: data.role,
      suspended: Boolean(data.suspended),
      ngoStatus: data.ngoStatus ?? null,
    };
  } catch {
    return null;
  }
}

export async function updateDemoSession(request: NextRequest): Promise<NextResponse> {
  let response = NextResponse.next({ request });

  const path = request.nextUrl.pathname;
  const isAuthPage = path === "/login" || path === "/signup";
  const isPublicPage = path === "/" || isAuthPage;

  const uid = request.cookies.get(DEMO_COOKIE)?.value;
  if (!uid) {
    if (!isPublicPage) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("redirect", path);
      return NextResponse.redirect(url);
    }
    return response;
  }

  const ctx = await guardContext(request, uid);
  if (!ctx) {
    // signed-in cookie without a profile (interrupted signup) — clear and bounce
    response = NextResponse.next({ request });
    response.cookies.set({ name: DEMO_COOKIE, value: "", path: "/", maxAge: 0 });
    if (!isPublicPage) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("error", "incomplete");
      return NextResponse.redirect(url);
    }
    return response;
  }

  const home = ROLE_HOME[ctx.role] ?? "/login";

  if (ctx.suspended) {
    if (path !== "/suspended") {
      return NextResponse.redirect(new URL("/suspended", request.url));
    }
    return response;
  }
  if (path === "/suspended") {
    return NextResponse.redirect(new URL(home, request.url));
  }

  if (isPublicPage) {
    return NextResponse.redirect(new URL(home, request.url));
  }

  const guard = PROTECTED_PREFIXES.find((g) => path.startsWith(g.prefix));
  if (guard && ctx.role !== guard.role) {
    const exceptions = ROLE_EXCEPTIONS[ctx.role] ?? [];
    if (!exceptions.some((p) => path.startsWith(p))) {
      return NextResponse.redirect(new URL(home, request.url));
    }
  }

  // pending NGOs can only open their dashboard (which shows the pending
  // screen) + profile — never redirect /ngo back onto itself (spec §6)
  if (ctx.role === "ngo" && path.startsWith("/ngo")) {
    if (
      ctx.ngoStatus &&
      ctx.ngoStatus !== "approved" &&
      path !== "/ngo" &&
      !path.startsWith("/ngo/profile")
    ) {
      return NextResponse.redirect(new URL("/ngo", request.url));
    }
  }

  return response;
}
