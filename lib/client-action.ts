"use client";

/**
 * Transport-level safety net for server-action calls from client components.
 *
 * Server actions return `{ ok, error }` for handled failures, but a network
 * drop, a stale action manifest, or an unexpected 500 REJECTS the promise —
 * and without this wrapper the button dies silently (unhandled rejection,
 * no feedback at all). This converts every rejection into a friendly
 * `{ ok: false }` result so existing toast branches always run.
 *
 * Auth redirects (redirect() inside the action) are handled by the Next.js
 * action protocol itself — the client navigates and this promise never
 * resolves, which is fine (the component unmounts on navigation).
 */
export async function runServerAction<T extends { ok: boolean }>(
  fn: () => Promise<T>,
): Promise<T | { ok: false; error: string }> {
  try {
    return await fn();
  } catch {
    return {
      ok: false,
      error: "The server could not complete that — check your connection and try again.",
    };
  }
}
