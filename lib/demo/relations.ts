/**
 * Demo mode — foreign-key registry mirroring supabase/migrations/00001_schema.sql.
 * Drives the embed resolver in the engine (`sender:sender_id(…)`,
 * `profile:profiles!ngos_profile_id_fkey(…)`, `teams!inner(…)`,
 * `team_members(*)`, `rooms!inner(…)`, …). Client + server safe (pure data).
 */

/** table -> { column -> referenced table } */
export const FK_REGISTRY: Record<string, Record<string, string>> = {
  profiles: {},
  ngos: { profile_id: "profiles" },
  volunteers: { profile_id: "profiles" },
  ngo_staff: { ngo_id: "ngos", profile_id: "profiles" },
  campaigns: { ngo_id: "ngos", created_by: "profiles" },
  volunteer_reports: {
    volunteer_id: "profiles",
    reported_by: "profiles",
    campaign_id: "campaigns",
  },
  teams: { campaign_id: "campaigns" },
  team_members: { team_id: "teams", user_id: "profiles" },
  applications: { campaign_id: "campaigns", volunteer_id: "profiles" },
  campaign_invites: {
    campaign_id: "campaigns",
    volunteer_id: "profiles",
    invited_by: "profiles",
  },
  fund_allocations: { campaign_id: "campaigns", member_id: "profiles" },
  chat_rooms: { campaign_id: "campaigns", created_by: "profiles" },
  chat_room_members: { room_id: "chat_rooms", user_id: "profiles" },
  messages: { room_id: "chat_rooms", sender_id: "profiles" },
  notifications: { user_id: "profiles" },
  ratings: {
    campaign_id: "campaigns",
    from_user_id: "profiles",
    to_user_id: "profiles",
  },
};

/** Postgres default constraint name: {table}_{column}_fkey */
export function fkeyColumn(table: string, fkeyName: string): string | null {
  const fks = FK_REGISTRY[table];
  if (!fks) return null;
  for (const col of Object.keys(fks)) {
    if (fkeyName === `${table}_${col}_fkey`) return col;
  }
  return null;
}

/** PostgREST join modifiers are not fkey names. */
const JOIN_MODIFIERS = new Set(["inner", "left", "right", "full"]);

export function isJoinModifier(hint: string): boolean {
  return JOIN_MODIFIERS.has(hint.toLowerCase());
}

function nameMatches(a: string, b: string): boolean {
  const x = a.toLowerCase();
  const y = b.toLowerCase();
  return x === y || x.endsWith(y) || y.endsWith(x);
}

/**
 * Resolve the relationship for an embed token on `parent`:
 * returns { kind: "forward", srcCol, target } or { kind: "reverse", srcCol (on child), target }.
 */
export function resolveRelation(
  parent: string,
  name: string,
  hint?: string
): { kind: "forward" | "reverse"; srcCol: string; target: string } | null {
  const fks = FK_REGISTRY[parent];
  if (!fks) return null;

  // 1. explicit fkey hint (e.g. profiles!ngos_profile_id_fkey)
  if (hint && !isJoinModifier(hint)) {
    const col = fkeyColumn(parent, hint);
    if (col) return { kind: "forward", srcCol: col, target: fks[col] };
    // the hint may name the fkey on the child (reverse direction)
    for (const [table, cols] of Object.entries(FK_REGISTRY)) {
      for (const [c, ref] of Object.entries(cols)) {
        if (ref === parent && hint === `${table}_${c}_fkey`) {
          return { kind: "reverse", srcCol: c, target: table };
        }
      }
    }
    return null;
  }

  // 2. embed name is an FK column of the parent (e.g. sender_id, campaign_id, ngo_id)
  if (fks[name]) return { kind: "forward", srcCol: name, target: fks[name] };

  // 3. embed name is (close to) a table the parent references (e.g. campaigns!inner from teams)
  for (const [col, ref] of Object.entries(fks)) {
    if (nameMatches(name, ref)) return { kind: "forward", srcCol: col, target: ref };
  }

  // 4. reverse: the embed name is (close to) a table referencing the parent
  for (const [table, cols] of Object.entries(FK_REGISTRY)) {
    for (const [c, ref] of Object.entries(cols)) {
      if (ref === parent && nameMatches(name, table)) {
        return { kind: "reverse", srcCol: c, target: table };
      }
    }
  }

  return null;
}

/** Find the column on `childTable` that references `parentTable`. */
export function reverseColumn(childTable: string, parentTable: string): string | null {
  const fks = FK_REGISTRY[childTable];
  if (!fks) return null;
  for (const [col, ref] of Object.entries(fks)) {
    if (ref === parentTable) return col;
  }
  return null;
}
