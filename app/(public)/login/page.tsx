"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, LogIn } from "lucide-react";
import { createClient, supabaseConfigured } from "@/lib/supabase/client";
import { loginSchema } from "@/lib/validation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { LogoMark } from "@/components/Logo";
import { useToast } from "@/hooks/use-toast";

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

    if (!supabaseConfigured) {
      setFormError(
        "Supabase is not configured yet — copy .env.example to .env.local and add your project keys (see README)."
      );
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
    <Card className="w-full max-w-md border-border/80 shadow-lift">
      <CardHeader className="items-center text-center">
        <LogoMark className="mx-auto mb-2 h-14 w-14" />
        <CardTitle className="text-2xl">Welcome back</CardTitle>
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
        <p className="mt-6 text-center text-sm text-muted-foreground">
          New to Sanjivani?{" "}
          <Link href="/signup" className="font-semibold text-primary hover:underline">
            Create an account
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}

export default function LoginPage() {
  return (
    <div className="flex items-center justify-center px-4 py-12 sm:py-20">
      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
