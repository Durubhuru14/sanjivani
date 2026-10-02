<div align="center">

<img src="public/sanjivani-icon.png" alt="Sanjivani" width="96" height="96" />

# Sanjivani

**One platform for NGOs to run campaigns, teams, chat, and funds — while volunteers build a verified, portable history of their community work.**

Replaces Excel sheets, WhatsApp groups, and physical notices with a single open-source system.

</div>

---

## Run the demo (no Supabase, no setup)

The app ships with a **built-in demo mode**. If no Supabase environment variables are
present, every data call is served by an **in-memory, seeded store** that mirrors the real
Postgres schema (see `lib/demo/`) — queries, inserts, updates, the notification triggers,
the budget guard, and role-based route guards all behave like the real backend.

```bash
bun install     # or: npm install
bun run dev     # or: npm run dev
```

Open http://localhost:3000 — the login screen lists every demo account, one click fills
the form. Log in as any role and walk the whole product:

| Try this | Log in as |
|---|---|
| Approve the pending NGO, review the volunteer report queue | `admin@sanjivani.test` |
| Run campaigns — teams, applications, chat rooms, funds, ratings | `greenearth@sanjivani.test` |
| See the "pending approval" gate (can only open dashboard + profile) | `newhope@sanjivani.test` |
| Accept/reject applications, message the team | `meera@sanjivani.test` (staff) |
| Browse campaigns, respond to an invite, view hours + ratings | `priya@sanjivani.test` (volunteer) |
| See the suspension screen | `tarun@sanjivani.test` |

All demo accounts use the password **`Passw0rd!`**

Demo-mode notes:

- The seeded store lives in the dev server process — it resets when the server restarts.
- Chat and notifications poll every few seconds instead of using Supabase Realtime.
- Image uploads return a placeholder (`/demo-placeholder.svg`).
- Add real Supabase env vars at any time (see below) and the demo layer steps aside
  automatically — no code changes.

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16 (App Router, Turbopack) + TypeScript 5 + Tailwind CSS 4 |
| UI | shadcn/ui (New York) + Lucide icons, **Impeccable "Neo Kinpaku"** design system (DESIGN.md) |
| Backend | Next.js API routes + server actions (most access via the Supabase client + RLS) |
| Database | Supabase (Postgres) — or the built-in seeded demo store |
| Auth | Supabase Auth (email + password) — cookie session in demo mode |
| Realtime | Supabase Realtime (chat messages, notifications) — polling in demo mode |
| Storage | Supabase Storage (NGO logos, avatars, campaign images) |
| Testing | Vitest + React Testing Library (unit), Playwright (E2E) |
| Fonts | Alumni Sans (display) + Albert Sans (body), bundled locally as woff2 |

## Local setup (real Supabase)

**Prerequisites:** Node.js 20+ (or Bun), the [Supabase CLI](https://supabase.com/docs/guides/cli/getting-started), and Docker for local Supabase.

```bash
# 1. Install dependencies
npm install          # or: bun install

# 2. Configure environment
cp .env.example .env.local
```

Get the keys for `.env.local`:

- **Local dev:** run `supabase start` and copy the values it prints:
  - `NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key>`
  - `SUPABASE_SERVICE_ROLE_KEY=<service role key>`
- **Hosted:** Supabase dashboard → Project Settings → API.

```bash
# 3. Apply migrations + seed demo data
supabase db reset

# 4. Start the dev server
npm run dev
```

Open http://localhost:3000.

> **⚠️ One dashboard setting (required):** email confirmation is **disabled** for this project.
> For **local** dev, `supabase/config.toml` already sets `enable_confirmations = false`.
> For a **hosted** project, open **Auth → Providers → Email → turn OFF "Confirm email"**.
> This is a dashboard toggle, not a migration — signup then logs the user in immediately
> with no confirmation email (a deliberate choice for the demo, per the spec).

## Demo credentials (seeded)

All seeded accounts use the password **`Passw0rd!`**

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

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Start the dev server on port 3000 (demo mode without env vars) |
| `npm run build` / `npm start` | Production build / serve |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript strict check |
| `npm test` | Vitest unit + component tests |
| `npm run test:e2e` | Playwright E2E (needs `supabase db reset` first) |
| `npm run db:reset` | Apply migrations + re-seed (local Supabase) |

## Folder structure

```
sanjivani/
├── app/
│   ├── (public)/            # Landing, login, signup
│   ├── (admin)/admin/       # Admin dashboard + NGO review
│   ├── (ngo)/ngo/           # Dashboard, staff, campaigns, chat, profile
│   ├── (staff)/staff/       # Dashboard, accept-invite, chat, profile
│   ├── (volunteer)/volunteer/ # Dashboard, browse, invites, chat, profile
│   ├── api/                 # Route handlers (spec §8) + auth bootstrap + /api/demo transport
│   └── suspended/           # Suspended-account screen
├── components/              # UI kit + chat/staff/funds/ratings/campaign components
├── lib/
│   ├── supabase/            # Browser/server/admin clients (demo-aware)
│   ├── demo/                # Seeded in-memory store + PostgREST-compatible engine
│   ├── validation.ts        # Zod schemas (spec §12)
│   └── funds.ts / ratings.ts
├── supabase/
│   ├── migrations/          # Schema, RLS, triggers, realtime, storage
│   └── seed.sql             # Demo dataset
├── tests/unit/              # Vitest specs
└── tests/e2e/               # Playwright specs (10 critical flows)
```

## Deployment (Vercel + Supabase)

1. Create a hosted Supabase project.
2. Run the SQL in `supabase/migrations/` (in order) via the SQL editor, then `supabase/seed.sql`.
3. In Auth → Providers → Email, disable **Confirm email**.
4. Push this repo to GitHub and import it in Vercel; add the three environment variables
   from `.env.example`.
5. Deploy — the app is fully serverless (no custom backend to host).

## What we did

See [`WHAT_WE_DID.md`](./WHAT_WE_DID.md) for the feature checklist, UML use cases,
final schema, route summary, and known limitations.
