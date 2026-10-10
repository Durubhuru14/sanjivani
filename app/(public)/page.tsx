import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  CalendarCheck,
  Landmark,
  MessageSquare,
  PiggyBank,
  Sprout,
  Users,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { LogoMark } from "@/components/Logo";
import { CountUp } from "@/components/CountUp";
import { Reveal } from "@/components/Reveal";
import { GardenBed, GardenSprig, StepFlora, Swash, VineLine, FloraMark } from "@/components/GardenArt";
import type { FloraStage } from "@/components/GardenArt";

export const dynamic = "force-dynamic";

async function getStats() {
  try {
    const supabase = await createClient();
    const [campaigns, volunteers, ngos] = await Promise.all([
      supabase
        .from("campaigns")
        .select("id", { count: "exact", head: true })
        .eq("type", "public")
        .neq("status", "cancelled"),
      supabase.from("volunteers").select("profile_id", { count: "exact", head: true }),
      supabase
        .from("ngos")
        .select("profile_id, org_name", { count: "exact" })
        .eq("verification_status", "approved")
        .limit(8),
    ]);
    return {
      campaigns: campaigns.count ?? 0,
      volunteers: volunteers.count ?? 0,
      ngos: ngos.count ?? 0,
      orgNames: (ngos.data ?? []).map((n: { org_name: string }) => n.org_name).filter(Boolean),
    };
  } catch {
    return null;
  }
}

const FEATURES = [
  {
    icon: CalendarCheck,
    title: "Campaigns without spreadsheets",
    text: "Create a campaign, publish it, and review volunteer applications in one place — no more tracking sheets and WhatsApp forwards.",
  },
  {
    icon: Users,
    title: "Teams made simple",
    text: "Accept applications, invite trusted volunteers, and add staff to teams. Everyone sees exactly what they need to see.",
  },
  {
    icon: MessageSquare,
    title: "Chat that stays organized",
    text: "Every campaign gets its own chat rooms. Pick who joins each room — no more mixing planning with field updates.",
  },
  {
    icon: PiggyBank,
    title: "Funds you can account for",
    text: "Allocate budgets to team members, mark payments, and export a clean summary for your records or donors.",
  },
  {
    icon: BadgeCheck,
    title: "Verified volunteer history",
    text: "Volunteers build a portable record of campaigns, hours, and ratings — with a verified badge once an admin approves them.",
  },
  {
    icon: Landmark,
    title: "Trust on both sides",
    text: "NGOs and volunteers rate each other after a campaign ends, so good work becomes visible and repeatable.",
  },
];

const STAGES: FloraStage[] = ["seed", "sprout", "plant", "bloom"];

export default async function LandingPage() {
  const stats = await getStats();

  /* pad short org lists so one marquee loop always fills the band */
  const marqueeOrgs = (() => {
    const names = stats?.orgNames ?? [];
    if (names.length === 0) return [];
    const half = [...names];
    while (half.length < 6) half.push(...names);
    return [...half, ...half];
  })();

  return (
    <div className="flex flex-col">
      {/* Hero — one warm wash, one confident headline, one proof object */}
      <section className="relative overflow-hidden border-b border-border">
        <div className="pattern-grid pattern-drift pointer-events-none absolute inset-0" aria-hidden />
        <div className="pattern-wash pointer-events-none absolute inset-0" aria-hidden />
        <div className="seam absolute inset-x-0 top-0" aria-hidden />
        <div className="relative mx-auto grid max-w-7xl gap-14 px-4 py-20 sm:px-6 md:py-28 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:gap-10 lg:px-8">
          <div className="max-w-xl">
            <p className="animate-fade-up kicker-chip">
              <span className="leaf-tick" aria-hidden />
              Community operations, grown carefully
            </p>
            <h1 className="animate-fade-up stagger-1 mt-6 font-display text-[clamp(2.7rem,5.5vw,4.5rem)] font-semibold leading-[1.04] tracking-[-0.015em] text-foreground">
              Run every campaign, team, and{" "}
              <span className="relative inline-block">
                rupee
                <Swash className="pointer-events-none absolute -bottom-2 left-0 h-[0.28em] w-full" />
              </span>{" "}
              in one place
            </h1>
            <p className="animate-fade-up stagger-2 mt-7 max-w-[62ch] text-base leading-relaxed text-foreground/80">
              Sanjivani replaces Excel sheets, WhatsApp groups, and paper notices with one simple
              system — so your NGO can focus on the work, and your volunteers can build a history
              they are proud of.
            </p>
            <div className="animate-fade-up stagger-3 mt-9 flex flex-wrap items-center gap-3">
              <Button size="lg" className="group-cta press gap-2 rounded-full px-8 text-base shadow-btn" asChild>
                <Link href="/signup">
                  Sign up as an NGO <ArrowRight className="group-cta-arrow h-4 w-4" aria-hidden />
                </Link>
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="press rounded-full bg-card px-8 text-base shadow-soft"
                asChild
              >
                <Link href="/signup">Sign up as a volunteer</Link>
              </Button>
            </div>
            <p className="animate-fade-up stagger-4 mt-5 text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link href="/login" className="font-medium text-leaf underline-offset-4 hover:underline">
                Log in
              </Link>
            </p>
          </div>

          {/* Proof object: the product, resting on the patterned ground like a
              card pinned to a community notice-board. Deliberately static after
              its entrance — a continuously floating card forces the text layer
              to re-rasterise every frame, which reads as flicker (especially
              on Windows subpixel text). */}
          <div className="animate-scale-in stagger-2 flex justify-center lg:justify-end">
            <div className="relative w-full max-w-md">
              {/* one garden sprig peeking from behind the top corner — hidden
                  below sm so the 320px hero stays uncluttered */}
              <GardenSprig variant="sun" className="absolute -left-11 -top-11 z-0 hidden h-24 w-24 sm:block" />
              <div className="sticker panel-raised relative z-10 rounded-xl p-6 sm:p-8">
                <div className="relative">
                  <div className="flex items-center justify-between border-b border-border/70 pb-4">
                    <span className="eyebrow">Field overview</span>
                    <span className="flex items-center gap-1.5 text-xs font-semibold text-leaf">
                      <span
                        className="animate-heart h-2 w-2 rounded-full bg-current text-leaf"
                        aria-hidden
                      />
                      live
                    </span>
                  </div>
                  <ul className="mt-5 divide-y divide-border/50">
                    {[
                      { k: "After-School Tutoring Program", v: "ongoing · 60 students", tone: "leaf" },
                      { k: "River Clean-Up Drive", v: "upcoming · 3 km target", tone: "bright" },
                      { k: "Tree Plantation Marathon", v: "completed · 1,000 saplings", tone: "muted" },
                    ].map((row) => (
                      <li
                        key={row.k}
                        className="flex min-h-[3rem] items-start gap-3 py-3 first:pt-0 last:pb-0"
                      >
                        <span
                          className={
                            row.tone === "leaf"
                              ? "mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-leaf/25 text-leaf ring-1 ring-leaf/60"
                              : row.tone === "bright"
                                ? "mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-leaf-bright/25 ring-1 ring-leaf-bright/60"
                                : "mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-muted ring-1 ring-border"
                          }
                          aria-hidden
                        />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-foreground">{row.k}</p>
                          <p className="mt-1 text-xs font-medium text-muted-foreground">
                            {row.v}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ul>
                  <p className="mt-4 border-t border-border/60 pt-4 text-xs font-medium text-muted-foreground">
                    hours · ratings · funds — one ledger
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* NGO marquee — real, approved organisations from the database */}
      {marqueeOrgs.length > 0 ? (
        <section className="relative overflow-hidden border-b border-border">
          <div className="mx-auto max-w-7xl px-4 pt-10 sm:px-6 lg:px-8">
            <Reveal className="text-center">
              <p className="eyebrow eyebrow-warm">Growing with Sanjivani</p>
            </Reveal>
            <Reveal className="marquee-mask mt-5 overflow-hidden pb-10" delay={0.1}>
              <div className="marquee-track">
                {marqueeOrgs.map((name, i) => (
                  <span key={`${name}-${i}`} className="flex items-center gap-2.5 whitespace-nowrap pr-12">
                    <Sprout className="h-3.5 w-3.5 text-leaf/70" aria-hidden />
                    <span className="font-display text-lg font-medium text-foreground/80">{name}</span>
                  </span>
                ))}
              </div>
            </Reveal>
          </div>
        </section>
      ) : null}

      {/* Stats — the forest band: the page's exclamation point. Deep green,
          paper numerals in the display serif, stitched seams between columns. */}
      <section className="band-forest relative overflow-hidden" aria-label="Platform statistics">
        <div className="pattern-seeds pointer-events-none absolute inset-0 opacity-60" aria-hidden />
        <div className="relative mx-auto grid max-w-7xl grid-cols-1 sm:grid-cols-3">
          {stats ? (
            [
              { v: stats.campaigns, k: "campaigns run on Sanjivani" },
              { v: stats.volunteers, k: "volunteers building history" },
              { v: stats.ngos, k: "verified NGOs" },
            ].map((s, i) => (
              <Reveal
                key={s.k}
                className="relative px-8 py-11 text-center sm:py-14"
                delay={i * 0.12}
              >
                {/* stitched seam between columns */}
                {i > 0 ? (
                  <span className="stitch-col absolute inset-y-8 left-0 hidden sm:block" aria-hidden />
                ) : null}
                {/* the flora each figure grew from — faint ink on the band */}
                <FloraMark
                  seed={s.k}
                  className="pointer-events-none absolute -bottom-3 right-3 h-20 w-20 text-band-ink/15"
                />
                <p className="font-display text-5xl font-semibold leading-none text-band-ink tabular-nums sm:text-6xl">
                  <CountUp value={s.v} duration={1100} />
                </p>
                <p className="mt-3 text-sm font-medium text-band-ink-soft">{s.k}</p>
              </Reveal>
            ))
          ) : (
            <p className="col-span-full px-8 py-12 text-center text-sm text-band-ink-soft">
              Stats are unavailable right now.
            </p>
          )}
        </div>
      </section>

      {/* Features — the first card spans wide as the editorial anchor */}
      <section className="relative overflow-hidden">
        <div className="pattern-dots pointer-events-none absolute inset-0 opacity-[0.14]" aria-hidden />
        <div className="relative mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <Reveal className="mx-auto max-w-2xl text-center">
            <p className="kicker-chip">
              <span className="leaf-tick" aria-hidden />
              The kit
            </p>
            <h2 className="mt-5 font-display text-[clamp(2.1rem,4vw,3rem)] font-semibold leading-[1.08] tracking-[-0.01em] text-foreground">
              Everything a small NGO actually needs
            </h2>
            <p className="mt-4 text-base leading-relaxed text-muted-foreground">
              Designed with non-technical staff in mind — clean screens, plain language, and
              nothing you have to babysit.
            </p>
          </Reveal>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f, i) => (
              <Reveal
                key={f.title}
                delay={(i % 3) * 0.09}
                className={i === 0 ? "lg:col-span-2" : undefined}
              >
                <Card
                  className={`interactive group h-full border-border bg-card shadow-card ${i === 0 ? "rounded-xl p-2 sm:p-3" : ""}`}
                >
                  <CardContent className={`h-full ${i === 0 ? "flex flex-col gap-5 rounded-lg bg-tint/50 p-6 sm:flex-row sm:items-start sm:gap-7 sm:p-8" : "p-6"}`}>
                    <span
                      className={`flex shrink-0 items-center justify-center rounded-2xl bg-tint text-leaf transition-transform duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] group-hover:rotate-[8deg] group-hover:scale-[1.06] dark:bg-primary/20 dark:text-primary-bright ${
                        i === 0 ? "h-14 w-14" : "mb-4 h-12 w-12"
                      }`}
                    >
                      <f.icon className={i === 0 ? "h-6 w-6" : "h-5 w-5"} aria-hidden />
                    </span>
                    <div>
                      <h3 className={`font-semibold text-foreground ${i === 0 ? "text-lg" : "text-base"}`}>
                        {f.title}
                      </h3>
                      <p className={`mt-2 leading-relaxed text-muted-foreground ${i === 0 ? "max-w-xl text-sm sm:text-base" : "text-sm"}`}>
                        {f.text}
                      </p>
                      {i === 0 ? (
                        <p className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-leaf">
                          <Sprout className="h-4 w-4" aria-hidden />
                          From first notice to final report — one thread
                        </p>
                      ) : null}
                    </div>
                  </CardContent>
                </Card>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* How it works — a growing timeline: each step plants the next stage.
          The vine between nodes draws itself as the section scrolls in. */}
      <section className="relative overflow-hidden border-t border-border bg-tint/40">
        <div className="relative mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <Reveal className="mx-auto max-w-2xl text-center">
            <p className="kicker-chip">
              <span className="leaf-tick" aria-hidden />
              How it works
            </p>
            <h2 className="mt-5 font-display text-[clamp(2.1rem,4vw,3rem)] font-semibold leading-[1.08] tracking-[-0.01em] text-foreground">
              Two sides, one ledger
            </h2>
            <p className="mt-4 text-base leading-relaxed text-muted-foreground">
              Like anything you grow, it starts small — a seed, a sprout, and then the whole garden.
            </p>
          </Reveal>
          <div className="mt-12 grid gap-6 md:grid-cols-2">
            {[
              {
                title: "For NGOs",
                steps: [
                  "Sign up and get verified by a platform admin (one-time).",
                  "Create campaigns, invite staff, and review volunteer applications.",
                  "Build teams, open chat rooms, and track funds as the work happens.",
                  "Mark the campaign completed, log hours, and rate your team.",
                ],
              },
              {
                title: "For volunteers",
                steps: [
                  "Create a free account and list your skills and interests.",
                  "Browse public campaigns or respond to personal invitations.",
                  "Join the team, chat, and see fund allocations that concern you.",
                  "Finish the campaign, get rated, and carry your verified history forward.",
                ],
              },
            ].map((col, i) => (
              <Reveal key={col.title} delay={i * 0.12} className="panel-raised rounded-xl p-7 sm:p-8">
                <h3 className="flex items-center gap-2.5 font-display text-xl font-medium text-leaf">
                  <Sprout className="h-4.5 w-4.5" aria-hidden />
                  {col.title}
                </h3>
                <ol className="mt-7">
                  {col.steps.map((step, j) => (
                    <li key={step} className="relative flex gap-5 pb-7 last:pb-0">
                      {/* the vine connecting this node to the next */}
                      {j < col.steps.length - 1 ? (
                        <span
                          className="absolute bottom-0 left-[22px] top-12 w-5"
                          aria-hidden
                        >
                          <VineLine className="h-full w-full" />
                        </span>
                      ) : null}
                      <span className="animate-sprout relative z-10 flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-primary/25 bg-tint shadow-soft" style={{ animationDelay: `${0.15 + j * 0.12}s` }}>
                        <StepFlora stage={STAGES[j]} className="h-7 w-7" />
                      </span>
                      <p className="pt-2.5 text-sm leading-relaxed text-muted-foreground">{step}</p>
                    </li>
                  ))}
                </ol>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Closing brand moment */}
      <section className="relative overflow-hidden border-t border-border">
        <div className="pattern-wash pointer-events-none absolute inset-0" aria-hidden />
        <div className="relative mx-auto flex max-w-7xl flex-col items-center px-4 py-20 text-center sm:px-6 lg:px-8">
          <Reveal>
            <LogoMark detailed className="h-14 w-14" />
          </Reveal>
          <Reveal delay={0.1}>
            <h2 className="mt-6 font-display text-[clamp(1.8rem,3vw,2.4rem)] font-semibold tracking-[-0.01em] text-foreground">
              Start your first campaign today
            </h2>
            <p className="mt-3 max-w-lg text-sm leading-relaxed text-muted-foreground">
              Free and open-source. Set up in minutes, run it for years.
            </p>
            <Button size="lg" className="group-cta press mt-7 gap-2 rounded-full px-8 shadow-btn" asChild>
              <Link href="/signup">
                Create your account <ArrowRight className="group-cta-arrow h-4 w-4" aria-hidden />
              </Link>
            </Button>
          </Reveal>
          {/* garden horizon — the growing bed this whole section rests on */}
          <Reveal delay={0.18} className="mt-14 w-full max-w-2xl">
            <GardenBed className="w-full" />
          </Reveal>
        </div>
      </section>
    </div>
  );
}
