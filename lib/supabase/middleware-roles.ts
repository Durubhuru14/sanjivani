/**
 * Shared route-guard tables (used by both the Supabase and demo sessions).
 */
export const ROLE_HOME: Record<string, string> = {
  admin: "/admin",
  ngo: "/ngo",
  staff: "/staff",
  volunteer: "/volunteer",
};

export const PROTECTED_PREFIXES: Array<{ prefix: string; role: string }> = [
  { prefix: "/admin", role: "admin" },
  { prefix: "/ngo", role: "ngo" },
  { prefix: "/staff", role: "staff" },
  { prefix: "/volunteer", role: "volunteer" },
];

// The staff invite claim page is reachable by logged-in users of other roles
// (e.g. a volunteer whose email was invited) — spec §5 "accept-invite".
export const ROLE_EXCEPTIONS: Record<string, string[]> = {
  volunteer: ["/staff/accept-invite"],
  ngo: ["/staff/accept-invite"],
  admin: ["/staff/accept-invite"],
};
