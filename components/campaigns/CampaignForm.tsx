"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, Save } from "lucide-react";
import { campaignSchema } from "@/lib/validation";
import { ImageUpload } from "@/components/ImageUpload";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

export interface CampaignFormValues {
  title: string;
  description: string;
  objectives: string;
  location: string;
  start_date: string;
  end_date: string;
  type: "public" | "invite";
  status: "upcoming" | "ongoing" | "completed" | "cancelled";
  total_budget: string;
  image_url: string;
}

export const emptyCampaign: CampaignFormValues = {
  title: "",
  description: "",
  objectives: "",
  location: "",
  start_date: "",
  end_date: "",
  type: "public",
  status: "upcoming",
  total_budget: "",
  image_url: "",
};

const STATUS_OPTIONS: Array<{ value: CampaignFormValues["status"]; label: string }> = [
  { value: "upcoming", label: "Upcoming" },
  { value: "ongoing", label: "Ongoing" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

/** Legal successors per status — must stay in sync with the toolbar's
 *  NEXT_STATUS map and the server-side CAMPAIGN_TRANSITIONS guard. */
const NEXT: Record<CampaignFormValues["status"], CampaignFormValues["status"][]> = {
  upcoming: ["ongoing", "cancelled"],
  ongoing: ["completed", "cancelled"],
  completed: [],
  cancelled: [],
};

/** Shared create/edit campaign form (spec §5 Campaign Create/Edit).
 *  Status: campaigns always start "upcoming" (create mode hard-codes it and
 *  hides the field); edit mode offers only the current status and its legal
 *  successors via the NEXT map above — the form can no longer bypass the
 *  campaign lifecycle. */
export function CampaignForm({
  mode,
  initial,
  submit,
}: {
  mode: "create" | "edit";
  initial: CampaignFormValues;
  submit: (values: CampaignFormValues) => Promise<{ ok: boolean; error?: string; id?: string }>;
}) {
  const [values, setValues] = useState<CampaignFormValues>(initial);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  function set<K extends keyof CampaignFormValues>(key: K, value: CampaignFormValues[K]) {
    setValues((v) => ({ ...v, [key]: value }));
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFieldErrors({});
    setFormError(null);
    const parsed = campaignSchema.safeParse({
      ...values,
      total_budget: values.total_budget === "" ? 0 : values.total_budget,
    });
    if (!parsed.success) {
      const errs: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = String(issue.path[0] ?? "form");
        if (!errs[key]) errs[key] = issue.message;
      }
      setFieldErrors(errs);
      return;
    }

    setBusy(true);
    startTransition(async () => {
      try {
        const result = await submit(values);
        if (!result.ok) {
          setFormError(result.error ?? "Something went wrong.");
          return;
        }
        toast({
          title: mode === "create" ? "Campaign created" : "Campaign updated",
          description: mode === "create" ? "You can now build your team." : undefined,
        });
        if (result.id) {
          router.push(`/ngo/campaigns/${result.id}`);
          router.refresh();
        } else {
          router.refresh();
        }
      } catch {
        setFormError("Network error — please try again.");
      } finally {
        setBusy(false);
      }
    });
  }

  const err = (key: string) =>
    fieldErrors[key] ? (
      <p className="text-sm text-destructive" role="alert">
        {fieldErrors[key]}
      </p>
    ) : null;

  return (
    <form onSubmit={onSubmit} noValidate>
      {formError && (
        <div className="mb-4 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive" role="alert">
          {formError}
        </div>
      )}

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="c-title">Title</Label>
          <Input
            id="c-title"
            placeholder="River Clean-Up Drive"
            value={values.title}
            maxLength={140}
            onChange={(e) => set("title", e.target.value)}
            aria-invalid={Boolean(fieldErrors.title)}
          />
          {err("title")}
        </div>

        <div className="space-y-2">
          <Label htmlFor="c-desc">Description</Label>
          <Textarea
            id="c-desc"
            placeholder="What is this campaign about? Keep it friendly and clear."
            rows={4}
            maxLength={4000}
            value={values.description}
            onChange={(e) => set("description", e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="c-obj">Objectives</Label>
          <Textarea
            id="c-obj"
            placeholder="Clear 3 km of riverbank; run 2 school sessions…"
            rows={3}
            maxLength={2000}
            value={values.objectives}
            onChange={(e) => set("objectives", e.target.value)}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="c-location">Location</Label>
            <Input
              id="c-location"
              placeholder="Pune"
              value={values.location}
              maxLength={140}
              onChange={(e) => set("location", e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="c-budget">Total budget (₹)</Label>
            <Input
              id="c-budget"
              type="number"
              min="0"
              step="0.01"
              placeholder="20000"
              value={values.total_budget}
              onChange={(e) => set("total_budget", e.target.value)}
              aria-invalid={Boolean(fieldErrors.total_budget)}
            />
            {err("total_budget")}
          </div>

          <div className="space-y-2">
            <Label htmlFor="c-start">Start date</Label>
            <Input
              id="c-start"
              type="date"
              value={values.start_date}
              onChange={(e) => set("start_date", e.target.value)}
              aria-invalid={Boolean(fieldErrors.start_date)}
            />
            {err("start_date")}
          </div>

          <div className="space-y-2">
            <Label htmlFor="c-end">End date</Label>
            <Input
              id="c-end"
              type="date"
              value={values.end_date}
              onChange={(e) => set("end_date", e.target.value)}
              aria-invalid={Boolean(fieldErrors.end_date)}
            />
            {err("end_date")}
          </div>

          <div className="space-y-2">
            <Label htmlFor="c-type">Visibility</Label>
            <Select value={values.type} onValueChange={(v) => set("type", v as "public" | "invite")}>
              <SelectTrigger id="c-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="public">Public — anyone can apply</SelectItem>
                <SelectItem value="invite">Invite-only — you invite volunteers</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {mode === "edit" ? (
            <div className="space-y-2">
              <Label htmlFor="c-status">Status</Label>
              <Select
                value={values.status}
                onValueChange={(v) => set("status", v as CampaignFormValues["status"])}
              >
                <SelectTrigger id="c-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.filter(
                    (o) => o.value === initial.status || NEXT[initial.status].includes(o.value)
                  ).map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                      {o.value === initial.status ? " (current)" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {NEXT[initial.status].length === 0
                  ? "This campaign has ended — its status can no longer change."
                  : "Use the buttons on the campaign page to advance the lifecycle; only legal transitions are listed."}
              </p>
            </div>
          ) : (
            /* create mode: campaigns always start upcoming — no field needed */
            <input type="hidden" name="status" value="upcoming" />
          )}
        </div>

        <div className="space-y-2">
          <Label>Campaign image</Label>
          <ImageUpload
            value={values.image_url}
            onChange={(url) => set("image_url", url)}
            folder="campaigns"
            label="Upload image"
          />
        </div>
      </div>

      <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
        {mode === "create" ? (
          <Button type="button" variant="outline" asChild className="sm:min-w-28">
            <Link href="/ngo/campaigns">Cancel</Link>
          </Button>
        ) : null}
        <Button type="submit" disabled={busy || pending} className="gap-2 sm:min-w-36">
          {busy || pending ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          ) : (
            <Save className="h-4 w-4" aria-hidden />
          )}
          {mode === "create" ? "Create campaign" : "Save changes"}
        </Button>
      </div>
    </form>
  );
}
