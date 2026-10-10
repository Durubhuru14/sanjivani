"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, LogIn } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { loginSchema } from "@/lib/validation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { LogoMark } from "@/components/Logo";
import { GardenBed } from "@/components/GardenArt";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const redirectParam = searchParams.get("redirect");
  const errorParam = searchParams.get("error");
  const sessionExpired = searchParams.get("reason") === "expired";

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setFieldErrors({});
    const parsed = loginSchema.safeParse({ email, password });
    if (!parsed.success) {
      const errs: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        errs[String(issue.path[0] ?? "form")] = issue.message;
      }
      setFieldErrors(errs);
      return;
    }

    setBusy(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({
        email: parsed.data.email,
        password: parsed.data.password,
      });
      if (error) {
        setFormError(
          error.message === "Invalid login credentials"
            ? "Wrong email or password. Please try again."
            : error.message
        );
        return;
      }
      toast({ title: "Welcome back!" });
      // "/" redirects logged-in users to their role dashboard via middleware
      router.push(redirectParam && redirectParam.startsWith("/") ? redirectParam : "/");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="animate-scale-in w-full max-w-md border-border bg-card shadow-lift">
      <CardHeader className="items-center text-center">
        <LogoMark detailed className="mx-auto mb-1 h-14 w-14" />
        <CardTitle className="font-display text-3xl font-medium tracking-wide text-foreground">
          Welcome back
        </CardTitle>
        <CardDescription>Log in to your Sanjivani account</CardDescription>
      </CardHeader>
      <CardContent>
        {sessionExpired && (
          <Alert className="mb-4" variant="default">
            <AlertDescription>Your session expired — please log in again.</AlertDescription>
          </Alert>
        )}
        {errorParam === "incomplete" && (
          <Alert className="mb-4" variant="destructive">
            <AlertDescription>
              Your account setup did not finish. Try signing up again with the same email.
            </AlertDescription>
          </Alert>
        )}
        {formError && (
          <Alert className="mb-4" variant="destructive">
            <AlertDescription>{formError}</AlertDescription>
          </Alert>
        )}
        <form onSubmit={onSubmit} className="space-y-4 scroll-mt-20" noValidate>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="you@example.org"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              aria-invalid={Boolean(fieldErrors.email)}
            />
            {fieldErrors.email && (
              <p className="text-sm text-destructive" role="alert">{fieldErrors.email}</p>
            )}
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Password</Label>
            </div>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              aria-invalid={Boolean(fieldErrors.password)}
            />
            {fieldErrors.password && (
              <p className="text-sm text-destructive" role="alert">{fieldErrors.password}</p>
            )}
          </div>
          <Button type="submit" className="press w-full gap-2" disabled={busy}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <LogIn className="h-4 w-4" aria-hidden />}
            {busy ? "Logging in…" : "Log in"}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          New to Sanjivani?{" "}
          <Link href="/signup" className="font-medium text-leaf hover:underline">
            Create an account
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}

export default function LoginPage() {
  return (
    <div className="relative grid min-h-[calc(100vh-4rem)] overflow-hidden lg:grid-cols-[1.05fr_1fr]">
      {/* Brand panel — botanical patterns, quiet motion, proof bullets */}
      <div className="relative hidden overflow-hidden border-r border-border lg:block">
        <div className="pattern-wash pointer-events-none absolute inset-0" aria-hidden />
        <div className="pattern-rings pattern-drift-rings pointer-events-none absolute -left-40 -bottom-44 h-[520px] w-[520px] opacity-50" aria-hidden />
        <div className="pattern-dots pointer-events-none absolute inset-0 opacity-20" aria-hidden />
        <div className="relative mx-auto flex h-full max-w-lg flex-col justify-center px-10 py-16">
          <LogoMark detailed className="animate-fade-up h-12 w-12" />
          <h2 className="animate-fade-up stagger-1 mt-6 font-display text-4xl font-normal leading-[1.08] text-foreground">
            One platform for every campaign, team, and rupee
          </h2>
          <p className="animate-fade-up stagger-2 mt-4 leading-relaxed text-muted-foreground">
            Replace the spreadsheets, WhatsApp groups, and paper notices with a single ledger
            your whole team can trust.
          </p>
          <ul className="mt-8 space-y-4">
            {[
              { title: "Campaigns & teams", text: "Applications, rosters, and hours in one place." },
              { title: "Scoped chat rooms", text: "Pick who joins each conversation — nothing leaks." },
              { title: "Fund ledger + CSV export", text: "Allocations, payments, and clean summaries." },
            ].map((item, i) => (
              <li key={item.title} className={cn("animate-fade-up flex gap-3", `stagger-${i + 3}`)}>
                <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-leaf" aria-hidden />
                <div>
                  <p className="text-sm font-semibold text-foreground">{item.title}</p>
                  <p className="text-sm text-muted-foreground">{item.text}</p>
                </div>
              </li>
            ))}
          </ul>
          {/* garden horizon — growth, from seedling to bloom */}
          <GardenBed className="mt-12 w-full" />
        </div>
      </div>

      {/* Form panel */}
      <div className="relative flex items-center justify-center px-4 py-12 sm:py-16">
        <div className="pattern-grid pointer-events-none absolute inset-0" aria-hidden />
        <Suspense fallback={null}>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
