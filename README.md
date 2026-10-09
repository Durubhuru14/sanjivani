<div align="center">

<img src="public/sanjivani-icon.png" alt="Sanjivani" width="96" height="96" />

# Sanjivani

**One platform for NGOs to run campaigns, teams, chat, and funds — while volunteers build a verified, portable history of their community work.**

Replaces Excel sheets, WhatsApp groups, and physical notices with a single open-source system.

</div>

---

## Quick start (local, Supabase CLI)

Everything runs against one backend: **Supabase**. The free Supabase CLI (Docker-based)
gives you a complete local stack — Postgres with all migrations, triggers, RLS policies,
realtime, storage, and the seeded dataset — in about two minutes.

```bash
# 1. Install dependencies
npm install

# 2. Start the local Supabase stack (requires Docker)
supabase start          # prints the project URL + keys when ready

# 3. Configure the app
cp .env.example .env.local
# fill in the three values printed by `supabase start`:
#   NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
#   NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key>
#   SUPABASE_SERVICE_ROLE_KEY=<service role key>

# 4. Apply migrations + seed data
supabase db reset

# 5. Run the app
npm run dev
```

Open http://localhost:3000 and log in with any seeded account (password **`Passw0rd!`**):

| Try this | Log in as |
|---|---|
| Approve the pending NGO, review the volunteer report queue | `admin@sanjivani.test` |
| Run campaigns — teams, applications, chat rooms, funds, ratings | `greenearth@sanjivani.test` |
| See the "pending approval" gate (can only open dashboard + profile) | `newhope@sanjivani.test` |
| Accept/reject applications, message the team | `meera@sanjivani.test` (staff) |
| Browse campaigns, respond to an invite, view hours + ratings | `priya@sanjivani.test` (volunteer) |
| See the suspension screen | `tarun@sanjivani.test` |

Without a configured `.env.local` the app shows a **setup screen** (`/setup`) with these
same steps — it never boots half-configured.

> **⚠️ One dashboard setting (hosted projects only):** email confirmation is **disabled**
> for this project. For **local** dev, `supabase/config.toml` already sets
> `enable_confirmations = false`. For a **hosted** project, open
> **Auth → Providers → Email → turn OFF "Confirm email"** — signup then logs the user in
> immediately with no confirmation email (a deliberate choice, per the spec).

Useful CLI commands while developing:

```bash
supabase db reset     # wipe + re-apply migrations and seed.sql (fresh data)
supabase status       # show URLs, keys, and running services
supabase stop         # stop the local stack (data persists in volumes)
```


## Troubleshooting the local setup

Almost every local-setup problem is one of these five:

| Symptom | Cause | Fix |
|---|---|---|
| `cannot connect to the Docker daemon` / `docker: command not found` | Docker isn't installed or isn't running | Install **Docker Desktop** (Windows/macOS: it must be *running* — check the whale icon) or `podman`. On Windows, Docker Desktop uses WSL 2; accept the default when it asks. |
| `supabase start` prints nothing useful / you lost the keys | The keys are only printed once | Run `supabase status` — it re-prints the API URL and both keys every time. |
| The app shows the **/setup screen** even after configuring | `.env.local` missing/wrong, or the dev server was started before the file existed | Check the file is named exactly `.env.local` (not `.env.local.txt`), has the three variables from `supabase status`, then **restart `npm run dev`**. |
| **"Invalid login credentials"** with the seeded accounts | `supabase db reset` didn't run or failed partway | Run `supabase db reset` again and read its output — it must end without errors. The seed creates the users; without it, no account exists. |
| `port is already allocated` (54321–54329) | Another Supabase project or service holds the port | `supabase stop` (stops this project's stack), or change the port in `supabase/config.toml`. |

Useful recovery commands:

```bash
supabase status        # is the stack up? what are my keys?
supabase db reset      # wipe + re-apply migrations + seed (fixes most data issues)
supabase stop          # stop the local stack (your data stays)
supabase stop --no-backup  # stop AND wipe local data volumes (full clean slate)
```

> **Windows notes:** the Supabase CLI runs natively, but Docker Desktop needs
> WSL 2 — the installer enables it and asks for one reboot. After that,
> everything above works in PowerShell exactly as written.

## Requirements & dependency health

**Node.js 20.19+ (22.13+ recommended)**, plus the
[Supabase CLI](https://supabase.com/docs/guides/cli/getting-started) and Docker for the
local backend. The lockfiles ship with the repo — `package-lock.json` for npm, `bun.lock`
for bun — and pin a tree that installs with **zero engine warnings** on Node 22 and 24.

**Security posture:**

- `npm audit` → **0 vulnerabilities** (production *and* dev tooling). The previous
  dev-only `braces` advisory came through the `eslint-config-next` dependency chain;
  the lint stack has since been replaced (see below) and the advisory is gone with it.
- The lint stack is `eslint 10 + typescript-eslint + eslint-plugin-react-hooks` —
  every package's peer range officially covers eslint 10, so `npm install` completes
  with **zero warnings** (no ERESOLVE, no deprecated packages, no EBADENGINE).
  `eslint-config-next` was dropped because its nested plugins
  (eslint-plugin-import, eslint-plugin-jsx-a11y) only accept eslint ≤ 9.
  `npm run lint` enforces real correctness rules (unused code, floating promises,
  hooks rules) and exits clean.
- jsdom 29 and all other dependencies are pinned to versions whose Node engine
  ranges cover Node 20.19 / 22.13 / 24+ — no `EBADENGINE` warnings on install.

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16 (App Router, Turbopack) + TypeScript 5 + Tailwind CSS 4 |
| UI | shadcn/ui (New York) + Lucide icons, **Sanjivani green design system** (spec §3) with light + dark themes and botanical patterns |
| Backend | Next.js API routes + server actions (most access via the Supabase client + RLS) |
| Database | Supabase (Postgres) — migrations, triggers, RLS, realtime, storage |
| Auth | Supabase Auth (email + password) |
| Realtime | Supabase Realtime (chat messages, notifications) |
| Storage | Supabase Storage (NGO logos, avatars, campaign images) |
| Testing | Vitest + React Testing Library (unit), Playwright (E2E) |
| Fonts | Alumni Sans (display) + Albert Sans (body), bundled locally as woff2 |

## Seeded accounts

All seeded accounts use the password **`Passw0rd!`** — created by `supabase/seed.sql`.

| Role | Email |
|---|---|
| Admin | `admin@sanjivani.test` |
| NGO (approved) | `greenearth@sanjivani.test` |
| NGO (approved) | `brightfutures@sanjivani.test` |
| NGO (pending — approval demo) | `newhope@sanjivani.test` |
| Staff (active) | `meera@sanjivani.test` |
| Staff (active) | `arvind@sanjivani.test` |
| Volunteer (verified) | `priya@sanjivani.test` |
| Volunteer (verified) | `rahul@sanjivani.test` |
| Volunteer (pending) | `aisha@sanjivani.test` |
| Volunteer (pending) | `vikram@sanjivani.test` |
| Volunteer (rejected) | `sneha@sanjivani.test` |
| Volunteer (**suspended** — suspension demo) | `tarun@sanjivani.test` |
| Staff invite (unclaimed — invite demo) | `kavita@sanjivani.test` (no account yet) |

Seeded data includes 4 campaigns (upcoming public, ongoing public with teams/chat/funds,
completed with ratings + hours, and an invite-only campaign with a pending invitation to
Aisha), an open volunteer report for the admin queue, and notifications for several users.

## Admin oversight

The admin dashboard is a full control room, not just a verification queue:

- **Platform oversight tabs** list every NGO, campaign, staff member, and volunteer on
  the platform with inline approve/reject, verify/reject, and suspend/unsuspend on every
  row — suspension never requires a report first.
- Campaign rows show the owner, status, type, dates, team size, applications, and budget
  utilisation — enough to keep operations in check without exposing ledgers or chat.
- **Suspending an NGO takes down their public operation**: their campaigns vanish from
  volunteer browse, detail pages 404 for non-members, and new applications are rejected.
  Unsuspending restores everything — data is never deleted.
- Notifications close the loop for every actor: new applications, campaign status
  changes, ratings, logged hours, report outcomes, declined invites, team removals, and
  suspension/unsuspension all reach the people they affect.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Start the dev server (Supabase via `.env.local`; `/setup` screen if unconfigured) |
| `npm run build` / `npm start` | Production build / serve (plain `next` commands — identical on Windows, macOS, Linux) |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript strict check |
| `npm test` | Vitest unit + component tests |
| `npm run test:e2e` | Playwright E2E — 14 specs (10 critical flows + server-action resilience + admin oversight directories). Needs the local Supabase stack running with migrations + seed applied; boots the dev server itself (point `E2E_BASE_URL` + `E2E_NO_SERVER=1` at another backend to test that instead) |
| `npm run db:reset` | Apply migrations + re-seed (local Supabase) |

## Dark & light mode

The UI ships with both themes (spec §3). Inside the app the switch lives in the **avatar
account menu**; on public pages (landing / login / signup) it is a button in the navbar.
- Choice is stored under a single `theme` key in `localStorage`.
- First visit defaults to the system preference (`prefers-color-scheme`).
- The theme is applied before first paint — no flash of the wrong theme.

## Motion & the account menu

- **Account menu**: clicking your avatar badge opens everything about “me” — profile &
  photo, workspace shortcuts (campaigns / invites / staff per role), the theme switch,
  and sign out. The navbar itself stays task-focused.
- **Motion system**: staggered fade-up entrances, scroll reveals (IntersectionObserver),
  count-up stats, drifting background patterns, a live NGO marquee on the landing page,
  chat-bubble pop-ins, and hover lift/sheen on cards. Entrances finish under 0.6 s and
  continuous motion is limited to the imperceptible pattern drift, the slow marquee,
  and the small “live” status dots — the Field Overview card is deliberately static
  after its entrance (a permanently floating card re-rasterises its text every frame,
  which reads as flicker). All of it is CSS-driven,
  fully disabled under `prefers-reduced-motion`, and adds no JavaScript bundle weight
  beyond two tiny components.
- **Admin profile**: admins get the same profile page (name, location, photo) as every
  other role — reachable from the account menu.

## Image uploads

- **Profile pictures** (volunteer / staff / admin avatars), **NGO logos**, and **campaign
  images** upload from every form that manages them (`ImageUpload` component).
- Files go to the public `media` bucket in Supabase Storage (PNG/JPG/WEBP/GIF,
  2 MB limit, per-user folder enforced by storage policies — spec §10).
- Seeded accounts, NGOs, and campaigns already include profile pictures and banners
  (`public/demo/`), referenced by `supabase/seed.sql`.

## Folder structure

```
sanjivani/
├── app/
│   ├── (public)/            # Landing, login, signup
│   ├── (admin)/admin/       # Admin dashboard + NGO review
│   ├── (ngo)/ngo/           # Dashboard, staff, campaigns, chat, profile
│   ├── (staff)/staff/       # Dashboard, accept-invite, chat, profile
│   ├── (volunteer)/volunteer/ # Dashboard, browse, invites, chat, profile
│   ├── api/                 # Route handlers (spec §8) + auth bootstrap
│   ├── setup/               # Shown when no backend is configured
│   └── suspended/           # Suspended-account screen
├── components/              # UI kit + chat/staff/funds/ratings/campaign components
├── lib/
│   ├── supabase/            # Browser/server/admin clients + route guards
│   ├── validation.ts        # Zod schemas (spec §12)
│   └── funds.ts / ratings.ts
├── supabase/
│   ├── migrations/          # Schema, RLS, triggers, realtime, storage
│   └── seed.sql             # Demo dataset
├── proxy.ts                 # Next 16 request guards (renamed middleware.ts)
├── tests/unit/              # Vitest specs
└── tests/e2e/               # Playwright specs (10 flows + action-resilience regressions)
```

## Deployment (Vercel + Supabase)

The build is the Vercel-standard `next build` — no custom scripts, no shell helpers, no
standalone bundling to wire up:

1. Create a hosted Supabase project.
2. Run the SQL in `supabase/migrations/` (in order) via the SQL editor, then `supabase/seed.sql`.
3. In Auth → Providers → Email, disable **Confirm email**.
4. Push this repo to GitHub and import it in Vercel; add the three environment variables
   from `.env.example`.
5. Deploy — the app is fully serverless (no custom backend to host).

Any other Node host works the same way: `npm run build && npm start`.

## What we did

See [`WHAT_WE_DID.md`](./WHAT_WE_DID.md) for the feature checklist, UML use cases,
final schema, route summary, and known limitations.
