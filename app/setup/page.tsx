import type { Metadata } from "next";
import { FlaskConical, KeyRound, Leaf, Server } from "lucide-react";
import { LogoMark } from "@/components/Logo";

export const metadata: Metadata = {
  title: "Setup required",
};

/**
 * Shown when the app is run with neither a Supabase backend nor demo mode —
 * normal `next dev`/`next start` keeps this a deliberate dead end, while
 * `npm run demo` opens the seeded demo and a configured .env.local goes
 * straight to the real backend.
 */
export default function SetupPage() {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-16">
      <div className="pattern-grid pointer-events-none absolute inset-0" aria-hidden />
      <div className="pattern-wash pointer-events-none absolute inset-0" aria-hidden />

      <div className="panel-raised relative w-full max-w-2xl rounded-xl p-8 sm:p-10">
        <div className="flex items-center gap-3">
          <LogoMark className="h-9 w-9" />
          <p className="eyebrow">Sanjivani</p>
        </div>

        <h1 className="mt-6 font-display text-3xl font-medium leading-tight sm:text-4xl">
          Almost there — pick how you want to run it
        </h1>
        <p className="mt-3 max-w-xl leading-relaxed text-muted-foreground">
          Sanjivani needs a backend to manage campaigns, teams, chat, and funds. Connect a free
          Supabase project for the real thing, or start the built-in demo with seeded data.
        </p>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <div className="rounded-lg border border-border bg-background/60 p-5">
            <span className="flex h-9 w-9 items-center justify-center rounded-md bg-tint text-leaf-deep">
              <FlaskConical className="h-4.5 w-4.5" aria-hidden />
            </span>
            <h2 className="mt-3 text-base font-semibold">Demo mode (no setup)</h2>
            <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
              Seeded NGOs, volunteers, campaigns, chat, and funds — runs entirely in memory.
            </p>
            <code className="mt-3 block rounded-md bg-muted px-3 py-2 font-mono text-xs text-foreground">
              npm run demo
            </code>
            <p className="mt-2 text-xs text-muted-foreground">
              Or set <code className="font-mono">NEXT_PUBLIC_DEMO_MODE=1</code> yourself. Demo
              accounts and the shared password are listed on the login screen.
            </p>
          </div>

          <div className="rounded-lg border border-border bg-background/60 p-5">
            <span className="flex h-9 w-9 items-center justify-center rounded-md bg-tint text-leaf-deep">
              <Server className="h-4.5 w-4.5" aria-hidden />
            </span>
            <h2 className="mt-3 text-base font-semibold">Real backend (Supabase)</h2>
            <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
              Create a free project at supabase.com, then:
            </p>
            <ol className="mt-3 space-y-1.5 text-sm text-muted-foreground">
              <li className="flex gap-2">
                <KeyRound className="mt-0.5 h-3.5 w-3.5 shrink-0 text-leaf" aria-hidden />
                <span>
                  Copy <code className="font-mono text-xs">.env.example</code> →{" "}
                  <code className="font-mono text-xs">.env.local</code> and fill the three keys
                </span>
              </li>
              <li className="flex gap-2">
                <Leaf className="mt-0.5 h-3.5 w-3.5 shrink-0 text-leaf" aria-hidden />
                <span>
                  Run <code className="font-mono text-xs">supabase db reset</code> to migrate +
                  seed
                </span>
              </li>
              <li className="flex gap-2">
                <Leaf className="mt-0.5 h-3.5 w-3.5 shrink-0 text-leaf" aria-hidden />
                <span>
                  Restart <code className="font-mono text-xs">npm run dev</code>
                </span>
              </li>
            </ol>
          </div>
        </div>

        <p className="mt-6 text-xs text-muted-foreground">
          Full walkthrough in the README — including the email-confirmation toggle and demo
          credentials.
        </p>
      </div>
    </div>
  );
}
