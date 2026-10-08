"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Save } from "lucide-react";
import { updateAdminProfile } from "@/app/(admin)/admin/actions";
import { runServerAction } from "@/lib/client-action";
import { ImageUpload } from "@/components/ImageUpload";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

export function AdminProfileForm({
  initial,
}: {
  initial: { name: string; location: string; avatarUrl: string };
}) {
  const [values, setValues] = useState(initial);
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const { toast } = useToast();

  function set<K extends keyof typeof values>(key: K, value: string) {
    setValues((v) => ({ ...v, [key]: value }));
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setBusy(true);
    startTransition(async () => {
      const res = await runServerAction(() => updateAdminProfile({
        name: values.name,
        location: values.location,
        avatarUrl: values.avatarUrl,
      }));
      setBusy(false);
      if (!res.ok) {
        setFormError(res.error ?? "Something went wrong.");
        return;
      }
      toast({ title: "Profile updated" });
      router.refresh();
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6" noValidate>
      {formError && (
        <div
          className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"
          role="alert"
        >
          {formError}
        </div>
      )}

      <div className="grid items-start gap-4 sm:grid-cols-2">
        <div className="space-y-2 sm:row-span-2">
          <Label>Photo</Label>
          <ImageUpload
            value={values.avatarUrl}
            onChange={(url) => set("avatarUrl", url)}
            folder="avatars"
            label="Upload photo"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="a-name">Full name</Label>
          <Input
            id="a-name"
            value={values.name}
            maxLength={100}
            onChange={(e) => set("name", e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="a-location">Location</Label>
          <Input
            id="a-location"
            value={values.location}
            maxLength={100}
            onChange={(e) => set("location", e.target.value)}
          />
        </div>
      </div>

      <div className="flex justify-end">
        <Button type="submit" className="gap-2" disabled={busy || pending}>
          {busy || pending ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          ) : (
            <Save className="h-4 w-4" aria-hidden />
          )}
          Save profile
        </Button>
      </div>
    </form>
  );
}
