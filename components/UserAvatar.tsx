import { cn } from "@/lib/utils";

/**
 * Avatar with graceful fallback: shows the profile picture when one is set,
 * otherwise a soft-green tile with the person's initials. Used in the
 * navbar, chat, team rosters, applications, and admin lists.
 */
export function UserAvatar({
  name,
  src,
  className,
  rounded = "full",
}: {
  name?: string | null;
  src?: string | null;
  className?: string;
  rounded?: "full" | "lg";
}) {
  const initials = (name ?? "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");

  return (
    <span
      className={cn(
        "pattern-dots flex shrink-0 select-none items-center justify-center overflow-hidden border border-leaf/25 bg-tint font-medium text-leaf-deep",
        rounded === "full" ? "rounded-full" : "rounded-lg",
        className ?? "h-8 w-8 text-xs"
      )}
      aria-hidden={false}
      role="img"
      aria-label={name ? `${name}'s avatar` : "Avatar"}
    >
      {src ? (
        <img src={src} alt="" className="h-full w-full object-cover" />
      ) : initials ? (
        <span className="tabular-nums">{initials}</span>
      ) : (
        <span className="h-1/2 w-1/2 rounded-full bg-leaf/40" />
      )}
    </span>
  );
}
