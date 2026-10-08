"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Save } from "lucide-react";
import { updateVolunteerProfile } from "@/app/(volunteer)/volunteer/actions";
import { ImageUpload } from "@/components/ImageUpload";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

export function VolunteerProfileForm({
  initial,
}: {
  initial: {
    name: string;
    location: string;
    skills: string;
    interests: string;
    availability: string;
    avatarUrl: string;
  };
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

  const split = (s: string) =>
    s
      .split(",")
      .map((v) => v.trim())
      .filter(Boolean)
      .slice(0, 10);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setBusy(true);
    startTransition(async () => {
      const res = await updateVolunteerProfile({
        name: values.name,
        location: values.location,
        skills: split(values.skills),
        interests: split(values.interests),
        availability: values.availability,
        avatarUrl: values.avatarUrl,
      });
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
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive" role="alert">
          {formError}
        </div>
      )}

      <div className="space-y-2">
        <Label>Photo</Label>
        <ImageUpload
          value={values.avatarUrl}
          onChange={(url) => set("avatarUrl", url)}
          folder="avatars"
          label="Upload photo"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="v-name">Full name</Label>
          <Input
            id="v-name"
            value={values.name}
            maxLength={100}
            onChange={(e) => set("name", e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="v-location">Location</Label>
          <Input
            id="v-location"
            value={values.location}
            maxLength={100}
            onChange={(e) => set("location", e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="v-skills">Skills (comma separated)</Label>
          <Input
            id="v-skills"
            placeholder="Teaching, First Aid"
            value={values.skills}
            onChange={(e) => set("skills", e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="v-interests">Interests (comma separated)</Label>
          <Input
            id="v-interests"
            placeholder="Education, Environment"
            value={values.interests}
            onChange={(e) => set("interests", e.target.value)}
          />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="v-availability">Availability</Label>
          <Input
            id="v-availability"
            placeholder="Weekends, evenings…"
            value={values.availability}
            maxLength={100}
            onChange={(e) => set("availability", e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            When NGOs can expect you — used while shortlisting for teams.
          </p>
        </div>
      </div>

      <div className="mt-6 flex justify-end">
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
