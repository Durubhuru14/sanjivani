import { Skeleton } from "@/components/ui/skeleton";

/** Dashboard loading skeleton (spec §11 UX — skeleton loaders on lists).
 *  Mirrors the dashboard rhythm: header block, 4 stat tiles (2-up on mobile),
 *  the two list cards, and the campaign card grid at the bottom. The layout
 *  already supplies the page gutter — no extra padding here. */
export default function NgoLoading() {
  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <Skeleton className="h-8 w-64 max-w-full" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
      </div>
      <Skeleton className="h-64" />
      <Skeleton className="h-48" />
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <Skeleton className="h-72" />
        <Skeleton className="hidden h-72 sm:block" />
        <Skeleton className="hidden h-72 lg:block" />
      </div>
    </div>
  );
}
