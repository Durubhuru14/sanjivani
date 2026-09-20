import { PlugZap } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

/** Shown when the app runs without Supabase env vars (see README setup). */
export function SetupNotice() {
  return (
    <div className="mx-auto max-w-xl">
      <Card className="text-center shadow-soft">
        <CardHeader className="items-center">
          <span className="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
            <PlugZap className="h-7 w-7" aria-hidden />
          </span>
          <CardTitle className="text-2xl">Almost there</CardTitle>
          <CardDescription className="text-base">
            This area needs a Supabase project connected.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm leading-relaxed text-muted-foreground">
          <p className="mb-2">
            Sanjivani stores all data in Supabase. To run this dashboard, create a free
            project, run the migrations, and add your keys:
          </p>
          <ol className="mx-auto max-w-sm list-inside list-decimal space-y-1 text-left">
            <li>Copy <code className="rounded bg-muted px-1">.env.example</code> to <code className="rounded bg-muted px-1">.env.local</code></li>
            <li>Add the project URL + anon key (+ service role key)</li>
            <li>Run <code className="rounded bg-muted px-1">supabase db reset</code></li>
            <li>Restart <code className="rounded bg-muted px-1">npm run dev</code></li>
          </ol>
          <p className="mt-2">Full walkthrough in the README — takes about five minutes.</p>
        </CardContent>
      </Card>
    </div>
  );
}
