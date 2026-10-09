#!/usr/bin/env python3
"""
Validate the Sanjivani SQL chain (8 migrations + seed) on a REAL Postgres,
mocking only the Supabase platform pieces that `supabase start` provides:
  - roles anon / authenticated / service_role + default privileges (base DB grants)
  - schema auth (users, identities) + auth.uid() reading request.jwt.claims
  - schema storage (buckets, objects) + foldername()/extension()
  - publication supabase_realtime
  - pgcrypto mocks: crypt()/gen_salt() (bcrypt-style, verification round-trips)
Then applies every migration in order + seed.sql — exactly what
`supabase db reset` does — and runs RLS read/write smoke tests as
authenticated users.
"""
import sys, glob, os
import psycopg
from pgserver import get_server

ROOT = "/home/z/my-project"
MIG_DIR = os.path.join(ROOT, "supabase/migrations")
SEED = os.path.join(ROOT, "supabase/seed.sql")

srv = get_server(pgdata="/tmp/pgdata-sv", cleanup_mode="stop")
uri = srv.get_uri()
print(f"postgres up: {uri.split('@')[1]}")

MOCK = r"""
-- ===== Supabase platform mocks (what `supabase start` provides) =====
create role anon nologin;
create role authenticated nologin;
create role service_role nologin;

-- Supabase base DB pre-grants API roles on future public tables
grant usage on schema public to anon, authenticated, service_role;
alter default privileges for role postgres in schema public
  grant all on tables to anon, authenticated, service_role;
alter default privileges for role postgres in schema public
  grant all on sequences to anon, authenticated, service_role;

create schema auth;

create table auth.users (
  id uuid primary key,
  instance_id uuid,
  aud varchar(255),
  role varchar(255),
  email varchar(255) unique,
  encrypted_password varchar(255),
  email_confirmed_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table auth.identities (
  id uuid primary key,
  user_id uuid references auth.users(id) on delete cascade,
  identity_data jsonb,
  provider text,
  provider_id text,
  last_sign_in_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- the real auth.uid() reads the JWT sub claim
create or replace function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claims', true)::json->>'sub', '')::uuid
$$;

create schema storage;
create table storage.buckets (
  id text primary key,
  name text unique,
  public boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create table storage.objects (
  id uuid primary key default gen_random_uuid(),
  bucket_id text references storage.buckets(id),
  name text,
  owner uuid,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  metadata jsonb
);
create or replace function storage.foldername(name text) returns text[] language sql immutable as $$
  with t as (select string_to_array(name, '/') as arr)
  select arr[1 : array_length(arr, 1) - 1] from t
$$;
create or replace function storage.extension(name text) returns text language sql immutable as $$
  select lower(split_part(name, '.', -1))
$$;

create publication supabase_realtime;

-- pgcrypto is unavailable in this harness; mock crypt()/gen_salt()
-- (bcrypt-style: salt embedded in the output so verification round-trips)
create or replace function gen_salt(alg text default 'bf', rounds int default 10)
  returns text language sql immutable as $$ select 'MOCKSALT0000000000' $$;
create or replace function crypt(pw text, setting text)
  returns text language sql immutable as $fn$
    select split_part(setting, '$', 1) || '$' || md5(pw || split_part(setting, '$', 1))
  $fn$;
"""

migrations = sorted(glob.glob(os.path.join(MIG_DIR, "*.sql")))
print(f"migrations found ({len(migrations)}):")
for m in migrations:
    print(f"  {os.path.basename(m)}")

with psycopg.connect(uri, autocommit=True) as conn:
    cur = conn.cursor()

    def run(label, sql):
        try:
            cur.execute(sql)
            print(f"  OK   {label}")
            return True
        except Exception as e:
            print(f"  FAIL {label}\n       {type(e).__name__}: {e}")
            return False

    print("\n== platform mocks ==")
    if not run("platform mock", MOCK):
        sys.exit(1)

    print("\n== migrations (as supabase db reset applies them) ==")
    for m in migrations:
        with open(m, encoding="utf-8") as f:
            sql = f.read()
        # pgcrypto ships with Supabase but not this harness — the mock above covers it
        sql = sql.replace("create extension if not exists pgcrypto;",
                          "-- (pgcrypto: provided by platform)")
        if not run(os.path.basename(m), sql):
            sys.exit(f"MIGRATION FAILED: {m}")

    print("\n== seed ==")
    with open(SEED, encoding="utf-8") as f:
        seed_sql = f.read()
    if not run("seed.sql", seed_sql):
        sys.exit("SEED FAILED")

    # ---------- sanity checks ----------
    print("\n== sanity checks ==")
    checks = [
        ("12 auth users seeded",
         "select count(*) = 12 from auth.users where email like '%@sanjivani.test'"),
        ("12 auth identities seeded",
         "select count(*) = 12 from auth.identities"),
        ("12 profiles (kavita is invite-only, no account)",
         "select count(*) = 12 from public.profiles"),
        ("bcrypt password verifies",
         """select encrypted_password = crypt('Passw0rd!', encrypted_password)
            from auth.users where email = 'admin@sanjivani.test'"""),
        ("3 NGOs (2 approved + 1 pending)",
         "select count(*) = 3 from public.ngos"),
        ("4 campaigns (upcoming/ongoing/completed/invite)",
         "select count(*) = 4 from public.campaigns"),
        ("media bucket exists",
         "select count(*) = 1 from storage.buckets where id = 'media' and public"),
        ("realtime publication covers messages + notifications",
         """select count(*) = 2 from pg_publication_tables
            where pubname = 'supabase_realtime'
              and tablename in ('messages','notifications')"""),
        ("notifications seeded",
         "select count(*) > 0 from public.notifications"),
        ("applications seeded",
         "select count(*) > 0 from public.applications"),
        ("chat rooms + members seeded",
         "select (select count(*) from public.chat_rooms) >= 3 and (select count(*) from public.chat_room_members) >= 10"),
    ]
    failures = []
    for label, q in checks:
        try:
            cur.execute("select coalesce((" + q + "), false)")
            ok = cur.fetchone()[0]
            print(f"  {'OK  ' if ok else 'FAIL'} {label}")
            if not ok:
                failures.append(label)
        except Exception as e:
            print(f"  FAIL {label} -> {type(e).__name__}: {e}")
            failures.append(label)

    # ---------- RLS smoke tests as authenticated users ----------
    print('\n== RLS read tests (set role authenticated + jwt claims) ==')

    def as_user(sub, label, q, expect):
        cur.execute("reset role")
        cur.execute("select set_config('request.jwt.claims', %s, false)",
                    ('{"sub":"' + sub + '"}',))
        cur.execute("set role authenticated")
        try:
            cur.execute(q)
            got = cur.fetchone()[0]
            ok = got == expect
            print(f"  {'OK  ' if ok else 'FAIL'} {label} (got {got}, want {expect})")
            if not ok:
                failures.append(label)
        except Exception as e:
            print(f"  FAIL {label} -> {type(e).__name__}: {e}")
            failures.append(label)
        finally:
            cur.execute("reset role")
            cur.execute("select set_config('request.jwt.claims', '', false)")

    PRIYA = "a0000000-0000-4000-8000-000000000007"   # volunteer (verified)
    GREEN = "a0000000-0000-4000-8000-000000000002"   # ngo owner (approved)
    NEWHOPE = "a0000000-0000-4000-8000-000000000004" # ngo (pending)
    AISHA = "a0000000-0000-4000-8000-000000000009"  # volunteer (pending verification)

    as_user(PRIYA, "profiles are a public directory (all 12 visible)",
            "select count(*) from public.profiles", 12)
    as_user(PRIYA, "volunteer sees approved NGOs only",
            "select count(*) from public.ngos where verification_status = 'approved'", 2)
    as_user(PRIYA, "volunteer cannot read others' notifications",
            "select count(*) from public.notifications where user_id <> '" + PRIYA + "'", 0)
    as_user(GREEN, "NGO sees own 2 + other approved NGO public campaigns",
            "select count(*) from public.campaigns", 3)
    as_user(PRIYA, "volunteer sees public campaigns of approved NGOs (browse)",
            "select count(*) from public.campaigns where type = 'public'", 3)
    as_user(NEWHOPE, "pending NGO still sees public campaign listings (by design)",
            "select count(*) from public.campaigns where type = 'public'", 3)
    as_user(PRIYA, "volunteer cannot read others' applications",
            "select count(*) from public.applications where volunteer_id <> '" + PRIYA + "'", 0)

    print('\n== RLS write-guard tests (must be DENIED) ==')

    def denied(sub, label, q):
        cur.execute("reset role")
        cur.execute("select set_config('request.jwt.claims', %s, false)",
                    ('{"sub":"' + sub + '"}',))
        cur.execute("set role authenticated")
        try:
            cur.execute(q)
            print(f"  FAIL {label} — write was ALLOWED")
            failures.append(label)
        except (psycopg.errors.InsufficientPrivilege, psycopg.errors.RaiseException) as e:
            # RLS denials arrive as InsufficientPrivilege; trigger guards raise
            # explicit exceptions (e.g. VOLUNTEER_VERIFICATION_ADMIN_ONLY)
            kind = "RLS" if isinstance(e, psycopg.errors.InsufficientPrivilege) else "trigger guard"
            print(f"  OK   {label} (denied by {kind})")
        except Exception as e:
            print(f"  FAIL {label} -> unexpected {type(e).__name__}: {e}")
            failures.append(label)
        finally:
            cur.execute("reset role")
            cur.execute("select set_config('request.jwt.claims', '', false)")

    denied(NEWHOPE, "pending NGO cannot create campaigns",
            "insert into public.campaigns (ngo_id, title, description, objectives, location, "
            "start_date, end_date, type, status, total_budget) values "
            "('" + NEWHOPE + "', 'x', 'x', 'x', 'x', current_date, current_date + 1, 'public', 'upcoming', 0)")
    denied(PRIYA, "volunteer cannot insert an NGO row for someone else",
            "insert into public.ngos (profile_id, org_name, registration_number, verification_status) "
            "values ('a0000000-0000-4000-8000-000000000fff', 'x', 'x', 'pending')")
    denied(AISHA, "pending volunteer cannot self-approve their verification",
            "update public.volunteers set verification_status = 'approved' "
            "where profile_id = '" + AISHA + "'")

    # NGO self-signup is by design (profile_id = auth.uid()) — but the insert
    # guard must force it to land as PENDING with rating 0 (never self-approved)
    print('\n== self-signup guard tests ==')
    cur.execute("reset role")
    cur.execute("select set_config('request.jwt.claims', %s, false)",
                ('{"sub":"' + PRIYA + '"}',))
    cur.execute("set role authenticated")
    try:
        cur.execute("insert into public.ngos (profile_id, org_name, registration_number, verification_status, logo_url) "
                    "values ('" + PRIYA + "', 'Rogue Org', 'XX-0000', 'approved', null)")
        cur.execute("select verification_status, avg_rating from public.ngos where profile_id = '" + PRIYA + "'")
        status, rating = cur.fetchone()
        ok = status == "pending" and rating == 0
        print(f"  {'OK  ' if ok else 'FAIL'} self-registered NGO lands pending with rating 0 (got {status}, {rating})")
        if not ok:
            failures.append("self-signup guard")
    except Exception as e:
        print(f"  FAIL self-signup guard -> {type(e).__name__}: {e}")
        failures.append("self-signup guard")
    finally:
        cur.execute("reset role")
        cur.execute("select set_config('request.jwt.claims', '', false)")
        cur.execute("delete from public.ngos where profile_id = '" + PRIYA + "'")

    cur.execute("reset role")
    print("\n" + ("=" * 50))
    if failures:
        print(f"RESULT: {len(failures)} FAILURES")
        for f in failures:
            print(f"  - {f}")
        sys.exit(1)
    print("RESULT: ALL CHECKS PASSED — SQL chain is valid for supabase db reset")
