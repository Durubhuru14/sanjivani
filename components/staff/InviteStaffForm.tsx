"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Mail, Trash2, UserPlus } from "lucide-react";
import { staffInviteSchema } from "@/lib/validation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

/** Invite a staff member by name + email (spec §4 InviteStaffForm). */
export function InviteStaffForm() {
  const [invitedName, setInvitedName] = useState("");
  const [invitedEmail, setInvitedEmail] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFieldErrors({});
    const parsed = staffInviteSchema.safeParse({ invited_name: invitedName, invited_email: invitedEmail });
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
      const res = await fetch("/api/ngo/staff/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      const json = await res.json();
      if (!json.success) {
        toast({ title: "Invite not sent", description: json.error?.message });
        return;
      }
      toast({
        title: "Invite sent",
        description: `${parsed.data.invited_name} will appear as “invited” until they sign up with that email.`,
      });
      setInvitedName("");
      setInvitedEmail("");
      router.refresh();
    } catch {
      toast({ title: "Invite not sent", description: "Network error — please try again." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="grid items-end gap-4 sm:grid-cols-[1fr_1fr_auto]" noValidate>
      <div className="space-y-2">
        <Label htmlFor="staff-name">Name</Label>
        <Input
          id="staff-name"
          placeholder="Kavita Rao"
          value={invitedName}
          onChange={(e) => setInvitedName(e.target.value)}
          aria-invalid={Boolean(fieldErrors.invited_name)}
        />
        {fieldErrors.invited_name && (
          <p className="text-sm text-destructive" role="alert">{fieldErrors.invited_name}</p>
        )}
      </div>
      <div className="space-y-2">
        <Label htmlFor="staff-email">Email</Label>
        <Input
          id="staff-email"
          type="email"
          placeholder="kavita@example.org"
          value={invitedEmail}
          onChange={(e) => setInvitedEmail(e.target.value)}
          aria-invalid={Boolean(fieldErrors.invited_email)}
        />
        {fieldErrors.invited_email && (
          <p className="text-sm text-destructive" role="alert">{fieldErrors.invited_email}</p>
        )}
      </div>
      <div className="flex items-end justify-end">
        <Button type="submit" className="gap-2" disabled={busy}>
          {busy ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          ) : (
            <UserPlus className="h-4 w-4" aria-hidden />
          )}
          Invite
        </Button>
      </div>
      <p className="text-xs text-muted-foreground sm:col-span-3">
        <Mail className="mr-1 inline h-3.5 w-3.5" aria-hidden />
        Staff accounts are created when the invited person signs up with this exact email —
        there is no public staff signup.
      </p>
    </form>
  );
}

export function RemoveStaffButton({ staffId, name }: { staffId: string; name: string }) {
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  async function remove() {
    if (!window.confirm(`Remove ${name}? They will also be taken off this NGO's campaign teams and chat rooms.`)) {
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(`/api/ngo/staff/${staffId}`, { method: "DELETE" });
      const json = await res.json();
      if (!json.success) {
        toast({ title: "Could not remove", description: json.error?.message });
        return;
      }
      toast({ title: "Staff member removed" });
      router.refresh();
    } catch {
      toast({ title: "Could not remove", description: "Network error — please try again." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button
      variant="outline"
      size="sm"
      className="gap-1.5 border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
      onClick={() => void remove()}
      disabled={busy}
    >
      {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Trash2 className="h-4 w-4" aria-hidden />}
      Remove
    </Button>
  );
}
