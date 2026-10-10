import { DEMO_COOKIE, demoActive } from "./flag";
import { getStore, type DemoUser } from "./store";

/** Strip the password before a demo user crosses the wire. */
export function publicUser(u: DemoUser | null): Record<string, unknown> | null {
  if (!u) return null;
  return {
    id: u.id,
    email: u.email,
    aud: "authenticated",
    role: "authenticated",
    created_at: u.created_at,
    app_metadata: { provider: "email", providers: ["email"] },
    user_metadata: {},
    user: u,
  };
}

export function userFromCookie(cookieValue: string | undefined): DemoUser | null {
  if (!cookieValue || !demoActive) return null;
  return getStore().users.find((u) => u.id === cookieValue) ?? null;
}

export { DEMO_COOKIE, demoActive };
