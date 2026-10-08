import { Skeleton } from "@/components/ui/skeleton";

/** Dashboard loading skeleton (spec §11 UX — skeleton loaders on lists).
 *  Mirrors the real page: PageHeader shape, 4-tile stat row (2-up on mobile),
 *  then the 2x2 card grid. The layout already provides the page padding. */
export default function DashboardLoading() {
  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <Skeleton className="h-8 w-56 max-w-full" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Skeleton className="h-28 rounded-md" />
        <Skeleton className="h-28 rounded-md" />
        <Skeleton className="h-28 rounded-md" />
        <Skeleton className="h-28 rounded-md" />
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Skeleton className="h-64 rounded-md" />
        <Skeleton className="h-64 rounded-md" />
        <Skeleton className="h-64 rounded-md" />
        <Skeleton className="h-64 rounded-md" />
      </div>
    </div>
  );
}
