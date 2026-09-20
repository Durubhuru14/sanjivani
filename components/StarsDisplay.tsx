import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

export function StarsDisplay({
  score,
  size = "md",
  className,
}: {
  score: number;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const rounded = Math.round(score);
  const dim = { sm: "h-3.5 w-3.5", md: "h-4 w-4", lg: "h-5 w-5" }[size];
  return (
    <span
      className={cn("inline-flex items-center gap-0.5", className)}
      aria-label={`Average rating ${score} out of 5`}
    >
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={cn(
            dim,
            i <= rounded ? "fill-amber-400 text-amber-400" : "fill-muted text-muted"
          )}
          aria-hidden
        />
      ))}
      <span className="ml-1 text-sm font-semibold text-foreground">{score > 0 ? score.toFixed(2) : "New"}</span>
    </span>
  );
}
