"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, LogIn } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { demoActive } from "@/lib/demo/flag";
import { loginSchema } from "@/lib/validation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { LogoMark } from "@/components/Logo";
import { useToast } from "@/hooks/use-toast";

const DEMO_ACCOUNTS = [
  { email: "admin@sanjivani.test", label: "Platform admin" },
  { email: "greenearth@sanjivani.test", label: "NGO · Green Earth" },
  { email: "brightfutures@sanjivani.test", label: "NGO · Bright Futures" },
  { email: "newhope@sanjivani.test", label: "NGO · pending review" },
  { email: "meera@sanjivani.test", label: "Staff · Green Earth" },
  { email: "priya@sanjivani.test", label: "Volunteer · verified" },
  { email: "aisha@sanjivani.test", label: "Volunteer · pending" },
  { email: "tarun@sanjivani.test", label: "Volunteer · suspended" },
];

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

  function fillDemo(accountEmail: string) {
    setEmail(accountEmail);
    setPassword("Passw0rd!");
    setFormError(null);
    setFieldErrors({});
  }

  return (
    <Card className="w-full max-w-md border-border bg-card shadow-lift">
      <CardHeader className="items-center text-center">
        <LogoMark className="mx-auto mb-1 h-12 w-12" />
        <CardTitle className="font-display text-3xl font-light tracking-normal text-champagne">
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
        <form onSubmit={onSubmit} className="space-y-4" noValidate>
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
          <Button type="submit" className="w-full gap-2" disabled={busy}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <LogIn className="h-4 w-4" aria-hidden />}
            {busy ? "Logging in…" : "Log in"}
          </Button>
        </form>

        {demoActive ? (
          <div className="mt-6 rounded-md border border-kinpaku/25 bg-kinpaku/5 p-4">
            <p className="flex items-center gap-2 font-mono text-[0.625rem] font-medium uppercase tracking-[0.16em] text-kinpaku">
              <span className="h-1.5 w-1.5 rounded-full bg-kinpaku" aria-hidden />
              Demo mode · seeded data · no Supabase needed
            </p>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              Click an account to fill the form. Every account uses the password{" "}
              <code className="rounded-sm bg-muted px-1.5 py-0.5 font-mono text-[0.6875rem] text-champagne">Passw0rd!</code>
            </p>
            <div className="mt-3 grid grid-cols-1 gap-1.5 sm:grid-cols-2">
              {DEMO_ACCOUNTS.map((a) => (
                <button
                  key={a.email}
                  type="button"
                  onClick={() => fillDemo(a.email)}
                  className="truncate rounded-sm border border-border/70 bg-card px-2.5 py-1.5 text-left text-xs text-muted-foreground transition-colors hover:border-kinpaku/40 hover:text-foreground"
                >
                  <span className="text-champagne">{a.label}</span>
                  <span className="mx-1.5 text-kinpaku/60">·</span>
                  {a.email}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        <p className="mt-6 text-center text-sm text-muted-foreground">
          New to Sanjivani?{" "}
          <Link href="/signup" className="font-medium text-kinpaku hover:underline">
            Create an account
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}

export default function LoginPage() {
  return (
    <div className="relative flex items-center justify-center px-4 py-12 sm:py-20">
      <div className="gold-seam absolute inset-x-0 top-0" aria-hidden />
      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
