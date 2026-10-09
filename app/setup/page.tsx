import type { Metadata } from "next";
import { KeyRound, Leaf, Server } from "lucide-react";
import { LogoMark } from "@/components/Logo";

export const metadata: Metadata = {
  title: "Setup required",
};

/**
 * Shown when the app runs without a Supabase backend configured — normal
 * `next dev`/`next start` keeps this a deliberate dead end until .env.local
 * points at a Supabase project (local CLI or hosted).
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
          Almost there — connect your Supabase backend
        </h1>
        <p className="mt-3 max-w-xl leading-relaxed text-muted-foreground">
          Sanjivani needs a Supabase backend to manage campaigns, teams, chat, and funds.
          Run one locally with the Supabase CLI (free, Docker-based) or connect a hosted
          project — the steps are identical either way.
        </p>

        <div className="mt-8 rounded-xl border border-border bg-background/60 p-5">
          <span className="flex h-9 w-9 items-center justify-center rounded-md bg-tint text-leaf-deep dark:text-leaf-bright">
            <Server className="h-4.5 w-4.5" aria-hidden />
          </span>
          <h2 className="mt-3 text-base font-semibold">Local backend (Supabase CLI)</h2>
          <ol className="mt-3 space-y-1.5 text-sm text-muted-foreground">
            <li className="flex gap-2">
              <KeyRound className="mt-0.5 h-3.5 w-3.5 shrink-0 text-leaf" aria-hidden />
              <span>
                Install the <a className="font-medium text-leaf hover:underline" href="https://supabase.com/docs/guides/cli/getting-started" target="_blank" rel="noreferrer">Supabase CLI</a> (needs Docker)
              </span>
            </li>
            <li className="flex gap-2">
              <Leaf className="mt-0.5 h-3.5 w-3.5 shrink-0 text-leaf" aria-hidden />
              <span>
                Run <code className="font-mono text-xs">supabase start</code> — it prints your project URL and keys
              </span>
            </li>
            <li className="flex gap-2">
              <Leaf className="mt-0.5 h-3.5 w-3.5 shrink-0 text-leaf" aria-hidden />
              <span>
                Copy <code className="font-mono text-xs">.env.example</code> →{" "}
                <code className="font-mono text-xs">.env.local</code> and fill the three keys
              </span>
            </li>
            <li className="flex gap-2">
              <Leaf className="mt-0.5 h-3.5 w-3.5 shrink-0 text-leaf" aria-hidden />
              <span>
                Run <code className="font-mono text-xs">supabase db reset</code> to migrate + seed
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

        <p className="mt-6 text-xs text-muted-foreground">
          Full walkthrough — including the hosted-project path and the email-confirmation
          toggle — in the README.
        </p>
      </div>
    </div>
  );
}
