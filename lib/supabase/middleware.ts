import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { setupRequired } from "@/lib/supabase/config";
import {
  ROLE_HOME,
  PROTECTED_PREFIXES,
  ROLE_EXCEPTIONS,
} from "@/lib/supabase/middleware-roles";

export { ROLE_HOME };

/**
 * Next.js server-action POSTs (fetch with the `next-action` header) must
 * never receive a middleware redirect: a 307 mangles the action protocol
 * and the client throws an opaque "invalid server request" error instead
 * of navigating. Every server action enforces its own auth via its
 * requireXClient() guard (which redirects *inside* the action, handled
 * gracefully by the action protocol), so for action POSTs we still run the
 * session refresh below (cookies stay fresh) but every guard below returns
 * `response` instead of redirecting.
 */
function isServerAction(request: NextRequest): boolean {
  return request.method === "POST" && request.headers.has("next-action");
}

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  // No backend configured — send everything to the setup screen.
  if (setupRequired) {
    const path = request.nextUrl.pathname;
    if (path !== "/setup") {
      return NextResponse.redirect(new URL("/setup", request.url));
    }
    return response;
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // IMPORTANT: do not run code between createServerClient and auth.getUser()
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Server-action POSTs pass through un-redirected (see isServerAction).
  const skipRedirect = isServerAction(request);

  const path = request.nextUrl.pathname;
  const isAuthPage = path === "/login" || path === "/signup";
  const isPublicPage = path === "/" || isAuthPage;

  if (!user) {
    if (!isPublicPage && !skipRedirect) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("redirect", path);
      return NextResponse.redirect(url);
    }
    return response;
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, suspended")
    .eq("id", user.id)
    .single();

  // Authenticated but no profile row (interrupted signup) — sign out cleanly.
  if (!profile) {
    await supabase.auth.signOut();
    if (skipRedirect) return response;
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("error", "incomplete");
    return NextResponse.redirect(url);
  }

  const home = ROLE_HOME[profile.role] ?? "/login";

  // Suspension is enforced on every request (spec §6 / §10).
  if (profile.suspended) {
    if (path !== "/suspended" && !skipRedirect) {
      const url = request.nextUrl.clone();
      url.pathname = "/suspended";
      return NextResponse.redirect(url);
    }
    return response;
  }
  if (path === "/suspended") {
    return skipRedirect ? response : NextResponse.redirect(new URL(home, request.url));
  }

  // Logged-in users never see the landing / auth pages.
  if (isPublicPage) {
    // NextResponse.redirect requires an ABSOLUTE URL — ROLE_HOME values are
    // paths like "/admin", so resolve them against the request first.
    return skipRedirect ? response : NextResponse.redirect(new URL(home, request.url));
  }

  // Role-prefix guards.
  const guard = PROTECTED_PREFIXES.find((g) => path.startsWith(g.prefix));
  if (guard && profile.role !== guard.role) {
    const exceptions = ROLE_EXCEPTIONS[profile.role] ?? [];
    if (!exceptions.some((p) => path.startsWith(p))) {
      return skipRedirect ? response : NextResponse.redirect(new URL(home, request.url));
    }
  }

  // NGO gating: pending NGOs can only open /ngo (dashboard shows the pending screen)
  // and /ngo/profile — enforced here in the UI and via RLS for writes (spec §6).
  if (profile.role === "ngo" && path.startsWith("/ngo")) {
    const { data: ngo } = await supabase
      .from("ngos")
      .select("verification_status")
      .eq("profile_id", user.id)
      .single();
    if (
      ngo &&
      ngo.verification_status !== "approved" &&
      path !== "/ngo" &&
      !path.startsWith("/ngo/profile")
    ) {
      return skipRedirect
        ? response
        : NextResponse.redirect(new URL("/ngo", request.url));
    }
  }

  return response;
}
