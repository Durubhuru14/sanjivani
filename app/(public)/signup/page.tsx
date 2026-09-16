"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Building2, HeartHandshake, Loader2, MailCheck, UserCog } from "lucide-react";
import { createClient, supabaseConfigured } from "@/lib/supabase/client";
import { signUpSchema } from "@/lib/validation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { LogoMark } from "@/components/Logo";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

type Role = "ngo" | "volunteer" | "staff";

const ROLE_CARDS: Array<{ value: Role; title: string; hint: string; icon: typeof Building2 }> = [
  {
    value: "ngo",
    title: "I'm an NGO",
    hint: "Run campaigns, manage staff and volunteers, track funds",
    icon: Building2,
  },
  {
    value: "volunteer",
    title: "I'm a volunteer",
    hint: "Find campaigns, join teams, build a verified history",
    icon: HeartHandshake,
  },
  {
    value: "staff",
    title: "I have a staff invite",
    hint: "Your NGO invited you by email — claim it here",
    icon: UserCog,
  },
];

export default function SignupPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [role, setRole] = useState<Role>("volunteer");
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    location: "",
    orgName: "",
    registrationNumber: "",
    skills: "",
    interests: "",
    availability: "",
  });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [invite, setInvite] = useState<{ ngoName: string; invitedName: string | null } | null>(null);
  const [busy, setBusy] = useState(false);
  const [checking, setChecking] = useState(false);

  function set<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function checkInvite(email: string) {
    if (!email.includes("@") || !supabaseConfigured) return;
    setChecking(true);
    try {
      const res = await fetch("/api/auth/check-invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const json = await res.json();
      if (json?.success && json.data?.hasInvite) {
        setInvite({ ngoName: json.data.ngoName, invitedName: json.data.invitedName ?? null });
        setRole("staff");
        if (!form.name && json.data.invitedName) set("name", json.data.invitedName);
      } else {
        setInvite(null);
      }
    } catch {
      // invite check is best-effort only
    } finally {
      setChecking(false);
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFieldErrors({});
    setFormError(null);

    const payload = {
      email: form.email,
      password: form.password,
      role,
      name: form.name,
      location: form.location,
      orgName: form.orgName,
      registrationNumber: form.registrationNumber,
      skills: form.skills,
      interests: form.interests,
      availability: form.availability,
    };
    const parsed = signUpSchema.safeParse(payload);
    if (!parsed.success) {
      const errs: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = String(issue.path[0] ?? "form");
        if (!errs[key]) errs[key] = issue.message;
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
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      const json = await res.json();
      if (!json.success) {
        setFormError(json.error?.message ?? "Signup failed. Please try again.");
        return;
      }
      toast({
        title: "Account created",
        description:
          role === "ngo"
            ? "Your NGO is pending admin approval — you can complete your profile meanwhile."
            : "Welcome to Sanjivani!",
      });
      router.push(json.data.redirect ?? "/");
      router.refresh();
    } catch {
      setFormError("Network error — please try again.");
    } finally {
      setBusy(false);
    }
  }

  const error = (key: string) =>
    fieldErrors[key] ? (
      <p className="text-sm text-destructive" role="alert">
        {fieldErrors[key]}
      </p>
    ) : null;

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-12 sm:py-16">
      <Card className="border-border/80 shadow-lift">
        <CardHeader className="items-center text-center">
          <LogoMark className="mx-auto mb-2 h-14 w-14" />
          <CardTitle className="text-2xl">Create your account</CardTitle>
          <CardDescription>Choose how you want to use Sanjivani</CardDescription>
        </CardHeader>
        <CardContent>
          {invite && (
            <Alert className="mb-6 gap-2">
              <MailCheck className="h-4 w-4 shrink-0 text-primary" aria-hidden />
              <AlertDescription>
                You have a staff invite from <strong>{invite.ngoName}</strong> — sign up below
                to claim it. Staff accounts can only be created through an invite.
              </AlertDescription>
            </Alert>
          )}
          {formError && (
            <Alert className="mb-6" variant="destructive">
              <AlertDescription>{formError}</AlertDescription>
            </Alert>
          )}

          {/* Role selection */}
          <div className="grid gap-3 sm:grid-cols-3" role="radiogroup" aria-label="Account type">
            {ROLE_CARDS.map((card) => (
              <button
                key={card.value}
                type="button"
                role="radio"
                aria-checked={role === card.value}
                onClick={() => setRole(card.value)}
                className={cn(
                  "rounded-xl border-2 p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  role === card.value
                    ? "border-primary bg-primary/5"
                    : "border-border bg-card hover:border-primary/40"
                )}
              >
                <card.icon
                  className={cn("h-5 w-5", role === card.value ? "text-primary" : "text-muted-foreground")}
                  aria-hidden
                />
                <p className="mt-2 text-sm font-semibold">{card.title}</p>
                <p className="mt-0.5 text-xs leading-snug text-muted-foreground">{card.hint}</p>
              </button>
            ))}
          </div>

          <form onSubmit={onSubmit} className="mt-6 space-y-4" noValidate>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Full name</Label>
                <Input
                  id="name"
                  placeholder="Priya Sharma"
                  value={form.name}
                  onChange={(e) => set("name", e.target.value)}
                  aria-invalid={Boolean(fieldErrors.name)}
                />
                {error("name")}
              </div>
              <div className="space-y-2">
                <Label htmlFor="location">Location (optional)</Label>
                <Input
                  id="location"
                  placeholder="Pune"
                  value={form.location}
                  onChange={(e) => set("location", e.target.value)}
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.org"
                  value={form.email}
                  onChange={(e) => set("email", e.target.value)}
                  onBlur={(e) => void checkInvite(e.target.value)}
                  aria-invalid={Boolean(fieldErrors.email)}
                />
                {checking && <p className="text-xs text-muted-foreground">Checking for staff invites…</p>}
                {error("email")}
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete="new-password"
                  placeholder="At least 6 characters"
                  value={form.password}
                  onChange={(e) => set("password", e.target.value)}
                  aria-invalid={Boolean(fieldErrors.password)}
                />
                {error("password")}
              </div>
            </div>

            {role === "ngo" && (
              <div className="grid gap-4 rounded-xl border bg-muted/30 p-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="orgName">Organisation name</Label>
                  <Input
                    id="orgName"
                    placeholder="Green Earth Foundation"
                    value={form.orgName}
                    onChange={(e) => set("orgName", e.target.value)}
                    aria-invalid={Boolean(fieldErrors.orgName)}
                  />
                  {error("orgName")}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="registrationNumber">Registration number</Label>
                  <Input
                    id="registrationNumber"
                    placeholder="NGO-2019-114"
                    value={form.registrationNumber}
                    onChange={(e) => set("registrationNumber", e.target.value)}
                    aria-invalid={Boolean(fieldErrors.registrationNumber)}
                  />
                  {error("registrationNumber")}
                  <p className="text-xs text-muted-foreground">
                    Needed for verification by our admins.
                  </p>
                </div>
              </div>
            )}

            {role === "volunteer" && (
              <div className="grid gap-4 rounded-xl border bg-muted/30 p-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="skills">Skills (comma separated)</Label>
                  <Input
                    id="skills"
                    placeholder="Teaching, First Aid"
                    value={form.skills}
                    onChange={(e) => set("skills", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="interests">Interests (comma separated)</Label>
                  <Input
                    id="interests"
                    placeholder="Education, Environment"
                    value={form.interests}
                    onChange={(e) => set("interests", e.target.value)}
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="availability">Availability</Label>
                  <Input
                    id="availability"
                    placeholder="Weekends, evenings…"
                    value={form.availability}
                    onChange={(e) => set("availability", e.target.value)}
                  />
                </div>
              </div>
            )}

            {role === "staff" && !invite && (
              <Alert>
                <AlertDescription>
                  Staff accounts exist only through an NGO invite. Enter the email your NGO
                  invited — we will detect it automatically. If it is not detected, ask your
                  NGO to send the invite first.
                </AlertDescription>
              </Alert>
            )}

            <Button type="submit" className="w-full" disabled={busy || checking}>
              {busy ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Creating your account…
                </>
              ) : (
                "Create account"
              )}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link href="/login" className="font-semibold text-primary hover:underline">
              Log in
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
