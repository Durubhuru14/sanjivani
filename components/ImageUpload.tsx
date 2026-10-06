"use client";

import { useRef, useState } from "react";
import { ImagePlus, Loader2, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { demoActive } from "@/lib/demo/flag";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const MAX_SIZE = 2 * 1024 * 1024; // 2 MB (spec §10)
const ALLOWED = ["image/png", "image/jpeg", "image/webp", "image/gif"];

/**
 * Image picker + uploader used for avatars, NGO logos, and campaign images.
 *
 * Real backend: uploads to the public 'media' bucket under the signed-in
 * user's folder (enforced by the storage RLS policy) and returns the URL.
 * Demo mode: no storage service exists, so the image is resized in the
 * browser (canvas) and kept as a compact data URL — the seeded store
 * persists it alongside every other field, so uploads behave the same.
 */
export function ImageUpload({
  value,
  onChange,
  folder = "campaigns",
  label = "Upload image",
  className,
}: {
  value: string;
  onChange: (url: string) => void;
  folder?: "avatars" | "logos" | "campaigns";
  label?: string;
  className?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const { toast } = useToast();

  /** Resize + compress in the browser; returns a JPEG data URL. */
  async function fileToDataUrl(file: File): Promise<string> {
    const bitmapUrl = URL.createObjectURL(file);
    try {
      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const el = new Image();
        el.onload = () => resolve(el);
        el.onerror = () => reject(new Error("Could not read that image."));
        el.src = bitmapUrl;
      });
      const max = 640;
      const scale = Math.min(1, max / Math.max(img.width, img.height));
      const w = Math.max(1, Math.round(img.width * scale));
      const h = Math.max(1, Math.round(img.height * scale));
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Could not process that image.");
      ctx.drawImage(img, 0, 0, w, h);
      const type = file.type === "image/png" ? "image/png" : "image/jpeg";
      return canvas.toDataURL(type, 0.86);
    } finally {
      URL.revokeObjectURL(bitmapUrl);
    }
  }

  async function upload(file: File) {
    if (!ALLOWED.includes(file.type)) {
      toast({ title: "Unsupported file", description: "Please choose a PNG, JPG, WEBP or GIF image." });
      return;
    }
    if (file.size > MAX_SIZE) {
      toast({ title: "File too large", description: "Images must be 2 MB or smaller." });
      return;
    }
    setBusy(true);
    try {
      if (demoActive) {
        const dataUrl = await fileToDataUrl(file);
        onChange(dataUrl);
        toast({ title: "Image updated" });
      } else {
        const supabase = createClient();
        const { data: userData } = await supabase.auth.getUser();
        const userId = userData.user?.id;
        if (!userId) throw new Error("You need to be signed in to upload images.");
        const ext = file.name.split(".").pop()?.toLowerCase() ?? "png";
        const path = `${userId}/${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
        const { error } = await supabase.storage.from("media").upload(path, file, {
          cacheControl: "3600",
          upsert: false,
        });
        if (error) throw error;
        const { data } = supabase.storage.from("media").getPublicUrl(path);
        onChange(data.publicUrl);
        toast({ title: "Image uploaded" });
      }
    } catch (err) {
      toast({
        title: "Upload failed",
        description: err instanceof Error ? err.message : "Please try again.",
      });
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div className="pattern-dots flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border bg-muted">
        {value ? (
          <img src={value} alt="Preview" className="h-full w-full object-cover" />
        ) : (
          <ImagePlus className="h-5 w-5 text-muted-foreground" aria-hidden />
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        <input
          ref={inputRef}
          type="file"
          accept={ALLOWED.join(",")}
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void upload(file);
          }}
        />
        <Button
          type="button"
          variant="outline"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <ImagePlus className="h-4 w-4" aria-hidden />}
          {value ? "Change image" : label}
        </Button>
        {value ? (
          <Button type="button" variant="ghost" onClick={() => onChange("")} aria-label="Remove image">
            <Trash2 className="h-4 w-4" aria-hidden /> Remove
          </Button>
        ) : null}
        <p className="w-full text-xs text-muted-foreground">PNG, JPG, WEBP or GIF · up to 2 MB</p>
      </div>
    </div>
  );
}
