import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

/**
 * Next.js 16 "proxy" file convention (the renamed `middleware.ts`).
 * Runs for every matched request: refreshes the Supabase session cookie
 * and enforces the role rules from lib/supabase/middleware-roles —
 * including the /setup gate when no backend is configured.
 */
export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Run on everything except Next.js internals, static assets and API
     * routes (API routes enforce auth themselves and must return JSON).
     */
    "/((?!_next/static|_next/image|api/|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|webp|gif|ico|css|js|map)$).*)",
  ],
};
