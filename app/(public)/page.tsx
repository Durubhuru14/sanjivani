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
        .select("profile_id", { count: "exact", head: true })
        .eq("verification_status", "approved"),
    ]);
    return {
      campaigns: campaigns.count ?? 0,
      volunteers: volunteers.count ?? 0,
      ngos: ngos.count ?? 0,
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

  return (
    <div className="flex flex-col">
      {/* Hero — layered botanical patterns over the green wash */}
      <section className="relative overflow-hidden border-b border-border">
        <div className="pattern-grid pointer-events-none absolute inset-0" aria-hidden />
        <div className="pattern-wash pointer-events-none absolute inset-0" aria-hidden />
        <div
          className="pattern-rings pointer-events-none absolute -right-40 -top-48 hidden h-[540px] w-[540px] opacity-60 lg:block"
          aria-hidden
        />
        <div className="seam absolute inset-x-0 top-0" aria-hidden />
        <div className="relative mx-auto grid max-w-7xl gap-14 px-4 py-20 sm:px-6 md:py-28 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:gap-10 lg:px-8">
          <div className="max-w-xl">
            <p className="eyebrow">Community operations, grown carefully</p>
            <h1 className="mt-4 font-display text-[clamp(3rem,6.5vw,5rem)] font-normal leading-[1.04] tracking-[-0.01em] text-foreground">
              Run every campaign, team, and{" "}
              <span className="text-grow">rupee</span> in one place
            </h1>
            <p className="mt-6 max-w-[62ch] text-base leading-relaxed text-muted-foreground">
              Sanjivani replaces Excel sheets, WhatsApp groups, and paper notices with one simple
              system — so your NGO can focus on the work, and your volunteers can build a history
              they are proud of.
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-3">
              <Button size="lg" className="gap-2 px-8 text-base shadow-soft" asChild>
                <Link href="/signup">
                  Sign up as an NGO <ArrowRight className="h-4 w-4" aria-hidden />
                </Link>
              </Button>
              <Button size="lg" variant="outline" className="px-8 text-base" asChild>
                <Link href="/signup">Sign up as a volunteer</Link>
              </Button>
            </div>
            <p className="mt-5 text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link href="/login" className="font-medium text-leaf hover:underline">
                Log in
              </Link>
            </p>
          </div>

          {/* Proof object: the product, quietly floating on the patterned ground */}
          <div className="flex justify-center lg:justify-end">
            <div className="panel-raised animate-rise relative w-full max-w-md rounded-xl p-6 sm:p-8">
              <div className="pattern-dots pointer-events-none absolute inset-0 rounded-xl opacity-30" aria-hidden />
              <div className="relative">
                <div className="flex items-center justify-between border-b border-border/70 pb-4">
                  <span className="eyebrow">Field overview</span>
                  <span className="flex items-center gap-1.5 font-mono text-[0.625rem] uppercase tracking-[0.14em] text-leaf">
                    <span className="h-1.5 w-1.5 rounded-full bg-leaf" aria-hidden />
                    live
                  </span>
                </div>
                <div className="mt-5 space-y-4">
                  {[
                    { k: "After-School Tutoring Program", v: "ongoing · 60 students", tone: "leaf" },
                    { k: "River Clean-Up Drive", v: "upcoming · 3 km target", tone: "bright" },
                    { k: "Tree Plantation Marathon", v: "completed · 1,000 saplings", tone: "muted" },
                  ].map((row) => (
                    <div key={row.k} className="flex items-start gap-3 border-b border-border/50 pb-4 last:border-0 last:pb-0">
                      <span
                        className={
                          row.tone === "leaf"
                            ? "mt-1 h-2.5 w-2.5 shrink-0 rounded-sm bg-leaf/25 ring-1 ring-leaf/60"
                            : row.tone === "bright"
                              ? "mt-1 h-2.5 w-2.5 shrink-0 rounded-sm bg-leaf-bright/25 ring-1 ring-leaf-bright/60"
                              : "mt-1 h-2.5 w-2.5 shrink-0 rounded-sm bg-muted ring-1 ring-border"
                        }
                        aria-hidden
                      />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-foreground">{row.k}</p>
                        <p className="mt-0.5 font-mono text-[0.6875rem] uppercase tracking-[0.1em] text-muted-foreground">
                          {row.v}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="seam mt-6" aria-hidden />
                <p className="mt-4 font-mono text-[0.625rem] uppercase tracking-[0.18em] text-muted-foreground">
                  hours · ratings · funds — one ledger
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats — a growing bento band */}
      <section className="relative overflow-hidden border-b border-border bg-tint/50">
        <div className="pattern-seedling pointer-events-none absolute inset-0 opacity-40" aria-hidden />
        <div className="relative mx-auto grid max-w-7xl grid-cols-1 gap-px sm:grid-cols-3 sm:divide-x sm:divide-border/70">
          {stats ? (
            [
              { v: stats.campaigns, k: "campaigns run on Sanjivani", icon: Sprout },
              { v: stats.volunteers, k: "volunteers building history", icon: Users },
              { v: stats.ngos, k: "verified NGOs", icon: Landmark },
            ].map((s) => (
              <div key={s.k} className="px-8 py-9 text-center sm:py-11">
                <s.icon className="mx-auto h-4 w-4 text-leaf" aria-hidden />
                <p className="text-grow mt-3 font-display text-5xl font-medium leading-none tabular-nums">
                  {s.v}
                </p>
                <p className="mt-2.5 font-mono text-[0.6875rem] uppercase tracking-[0.14em] text-muted-foreground">
                  {s.k}
                </p>
              </div>
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
          <div className="mx-auto max-w-2xl text-center">
            <p className="eyebrow">The kit</p>
            <h2 className="mt-3 font-display text-[clamp(2.2rem,4vw,3rem)] font-normal leading-[1.08] text-foreground">
              Everything a small NGO actually needs
            </h2>
            <p className="mt-4 text-base leading-relaxed text-muted-foreground">
              Designed with non-technical staff in mind — clean screens, plain language, and
              nothing you have to babysit.
            </p>
          </div>
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <Card
                key={f.title}
                className="group border-border bg-card shadow-soft transition-all duration-200 hover:-translate-y-1 hover:border-leaf/45 hover:shadow-lift"
              >
                <CardContent className="p-6">
                  <span className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-tint text-leaf transition-colors group-hover:bg-leaf group-hover:text-primary-foreground">
                    <f.icon className="h-4.5 w-4.5" aria-hidden />
                  </span>
                  <h3 className="text-base font-semibold text-foreground">{f.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.text}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="relative overflow-hidden border-t border-border bg-tint/40">
        <div className="pattern-rings pointer-events-none absolute -left-52 bottom-[-180px] hidden h-[520px] w-[520px] opacity-50 lg:block" aria-hidden />
        <div className="relative mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <p className="eyebrow">How it works</p>
            <h2 className="mt-3 font-display text-[clamp(2.2rem,4vw,3rem)] font-normal leading-[1.08] text-foreground">
              Two sides, one ledger
            </h2>
          </div>
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
            ].map((col) => (
              <div key={col.title} className="panel-raised rounded-xl p-8">
                <h3 className="flex items-center gap-2.5 font-display text-xl font-medium text-leaf">
                  <Sprout className="h-4.5 w-4.5" aria-hidden />
                  {col.title}
                </h3>
                <ol className="mt-6 space-y-5">
                  {col.steps.map((step, i) => (
                    <li key={step} className="flex gap-4">
                      <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-tint font-mono text-[0.6875rem] font-semibold text-leaf">
                        {i + 1}
                      </span>
                      <p className="text-sm leading-relaxed text-muted-foreground">{step}</p>
                    </li>
                  ))}
                </ol>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Closing brand moment */}
      <section className="relative overflow-hidden border-t border-border">
        <div className="pattern-wash pointer-events-none absolute inset-0" aria-hidden />
        <div className="relative mx-auto flex max-w-7xl flex-col items-center px-4 py-16 text-center sm:px-6 lg:px-8">
          <LogoMark detailed className="h-14 w-14 animate-rise-slow" />
          <h2 className="mt-6 font-display text-[clamp(1.8rem,3vw,2.4rem)] font-normal text-foreground">
            Start your first campaign today
          </h2>
          <p className="mt-3 max-w-lg text-sm leading-relaxed text-muted-foreground">
            Free and open-source. Set up in minutes, run it for years.
          </p>
          <Button size="lg" className="mt-7 gap-2 px-8 shadow-soft" asChild>
            <Link href="/signup">
              Create your account <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
