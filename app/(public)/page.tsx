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
import { FallingLeaves } from "@/components/FallingLeaves";
import { Reveal } from "@/components/Reveal";
import { GardenBed, GardenSprig } from "@/components/GardenArt";

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
      {/* Hero — layered botanical patterns over the green wash */}
      <section className="relative overflow-hidden border-b border-border">
        <div className="pattern-grid pattern-drift pointer-events-none absolute inset-0" aria-hidden />
        <div className="pattern-wash pointer-events-none absolute inset-0" aria-hidden />
        <div
          className="pattern-rings pattern-drift-rings pointer-events-none absolute -right-40 -top-48 hidden h-[540px] w-[540px] opacity-60 lg:block"
          aria-hidden
        />
        <FallingLeaves />
        <div className="seam absolute inset-x-0 top-0" aria-hidden />
        <div className="relative mx-auto grid max-w-7xl gap-14 px-4 py-20 sm:px-6 md:py-28 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:gap-10 lg:px-8">
          <div className="max-w-xl">
            <p className="eyebrow eyebrow-warm animate-fade-up">Community operations, grown carefully</p>
            <h1 className="animate-fade-up stagger-1 mt-4 font-display text-[clamp(3rem,6.5vw,5rem)] font-normal leading-[1.04] tracking-[-0.01em] text-foreground">
              Run every campaign, team, and{" "}
              <span className="text-grow underline-sun">rupee</span> in one place
            </h1>
            <p className="animate-fade-up stagger-2 mt-7 max-w-[62ch] text-base leading-relaxed text-foreground/80">
              Sanjivani replaces Excel sheets, WhatsApp groups, and paper notices with one simple
              system — so your NGO can focus on the work, and your volunteers can build a history
              they are proud of.
            </p>
            <div className="animate-fade-up stagger-3 mt-9 flex flex-wrap items-center gap-3">
              <Button size="lg" className="group-cta press gap-2 px-8 text-base shadow-soft" asChild>
                <Link href="/signup">
                  Sign up as an NGO <ArrowRight className="group-cta-arrow h-4 w-4" aria-hidden />
                </Link>
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="press bg-card px-8 text-base shadow-soft"
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

          {/* Proof object: the product, resting on the patterned ground.
              Deliberately static after its entrance — a continuously floating
              card forces the text layer to re-rasterise every frame, which
              reads as flicker (especially on Windows subpixel text). */}
          <div className="animate-scale-in stagger-2 flex justify-center lg:justify-end">
            <div className="relative w-full max-w-md">
              {/* garden sprigs peeking from behind the card corners — hidden
                  below sm so the 320px hero stays uncluttered */}
              <GardenSprig variant="sun" className="absolute -left-10 -top-10 z-0 hidden h-24 w-24 sm:block" />
              <GardenSprig variant="butterfly" className="absolute -bottom-9 -right-7 z-0 hidden h-20 w-20 sm:block" />
              <div className="panel-raised relative z-10 rounded-xl p-6 sm:p-8">
                <div className="pattern-dots pointer-events-none absolute inset-0 rounded-xl opacity-30" aria-hidden />
                <div className="relative">
                <div className="flex items-center justify-between border-b border-border/70 pb-4">
                  <span className="eyebrow">Field overview</span>
                  <span className="flex items-center gap-1.5 text-xs font-semibold text-leaf">
                    <span
                      className="animate-pulse-dot h-1.5 w-1.5 rounded-full bg-current text-leaf"
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
                            ? "animate-pulse-dot mt-1 h-2.5 w-2.5 shrink-0 rounded-sm bg-leaf/25 text-leaf ring-1 ring-leaf/60"
                            : row.tone === "bright"
                              ? "mt-1 h-2.5 w-2.5 shrink-0 rounded-sm bg-leaf-bright/25 ring-1 ring-leaf-bright/60"
                              : "mt-1 h-2.5 w-2.5 shrink-0 rounded-sm bg-muted ring-1 ring-border"
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

      {/* Stats — a growing bento band */}
      <section className="relative overflow-hidden border-b border-border bg-tint/50">
        <div className="pattern-seedling pointer-events-none absolute inset-0 opacity-40" aria-hidden />
        <div className="relative mx-auto grid max-w-7xl grid-cols-1 gap-px sm:grid-cols-3 sm:divide-x sm:divide-border/70">
          {stats ? (
            [
              { v: stats.campaigns, k: "campaigns run on Sanjivani", icon: Sprout },
              { v: stats.volunteers, k: "volunteers building history", icon: Users },
              { v: stats.ngos, k: "verified NGOs", icon: Landmark },
            ].map((s, i) => (
              <Reveal
                key={s.k}
                className="px-8 py-9 text-center sm:py-11"
                delay={i * 0.12}
              >
                <s.icon className="mx-auto h-4 w-4 text-leaf" aria-hidden />
                <p className="text-grow mt-3 font-display text-5xl font-medium leading-none tabular-nums">
                  <CountUp value={s.v} duration={1100} />
                </p>
                <p className="mt-2.5 text-sm font-medium text-muted-foreground">
                  {s.k}
                </p>
              </Reveal>
            ))
          ) : (
            <p className="col-span-full px-8 py-10 text-center text-sm text-muted-foreground">
              Stats are unavailable right now.
            </p>
          )}
        </div>
      </section>

      {/* Features */}
      <section className="relative overflow-hidden">
        <div className="pattern-dots pointer-events-none absolute inset-0 opacity-[0.16]" aria-hidden />
        <div className="relative mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <Reveal className="mx-auto max-w-2xl text-center">
            <p className="eyebrow eyebrow-warm">The kit</p>
            <h2 className="mt-3 font-display text-[clamp(2.2rem,4vw,3rem)] font-normal leading-[1.08] text-foreground">
              Everything a small NGO actually needs
            </h2>
            <p className="mt-4 text-base leading-relaxed text-muted-foreground">
              Designed with non-technical staff in mind — clean screens, plain language, and
              nothing you have to babysit.
            </p>
          </Reveal>
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f, i) => (
              <Reveal key={f.title} delay={(i % 3) * 0.09}>
                <Card className="interactive group h-full border-border bg-card shadow-soft">
                  <CardContent className="p-6">
                    <span className="mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-tint text-leaf transition-all duration-200 group-hover:scale-105 group-hover:bg-leaf group-hover:text-primary-foreground">
                      <f.icon className="h-4.5 w-4.5" aria-hidden />
                    </span>
                    <h3 className="text-base font-semibold text-foreground">{f.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.text}</p>
                  </CardContent>
                </Card>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="relative overflow-hidden border-t border-border bg-tint/40">
        <div className="pattern-rings pattern-drift-rings pointer-events-none absolute -left-52 bottom-[-180px] hidden h-[520px] w-[520px] opacity-50 lg:block" aria-hidden />
        <div className="relative mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <Reveal className="mx-auto max-w-2xl text-center">
            <p className="eyebrow eyebrow-warm">How it works</p>
            <h2 className="mt-3 font-display text-[clamp(2.2rem,4vw,3rem)] font-normal leading-[1.08] text-foreground">
              Two sides, one ledger
            </h2>
          </Reveal>
          <div className="mt-12 grid gap-4 md:grid-cols-2">
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
              <Reveal key={col.title} delay={i * 0.12} className="panel-raised rounded-xl p-8">
                <h3 className="flex items-center gap-2.5 font-display text-xl font-medium text-leaf">
                  <Sprout className="h-4.5 w-4.5" aria-hidden />
                  {col.title}
                </h3>
                <ol className="mt-6 space-y-5">
                  {col.steps.map((step, j) => (
                    <li key={step} className="flex gap-4">
                      <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-tint text-xs font-semibold text-leaf">
                        {j + 1}
                      </span>
                      <p className="text-sm leading-relaxed text-muted-foreground">{step}</p>
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
            <h2 className="mt-6 font-display text-[clamp(1.8rem,3vw,2.4rem)] font-normal text-foreground">
              Start your first campaign today
            </h2>
            <p className="mt-3 max-w-lg text-sm leading-relaxed text-muted-foreground">
              Free and open-source. Set up in minutes, run it for years.
            </p>
            <Button size="lg" className="group-cta press mt-7 gap-2 px-8 shadow-soft" asChild>
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
