import { Skeleton } from "@/components/ui/skeleton";

/** Dashboard loading skeleton (spec §11 UX — skeleton loaders on lists).
 *  Mirrors the real page: PageHeader shape, organisation card, then the
 *  2-column teams/rooms grid. The layout already provides the page padding. */
export default function StaffLoading() {
  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <Skeleton className="h-8 w-56 max-w-full" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>
      <Skeleton className="h-32 rounded-md" />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Skeleton className="h-72 rounded-md" />
        <Skeleton className="h-72 rounded-md" />
      </div>
    </div>
  );
}
