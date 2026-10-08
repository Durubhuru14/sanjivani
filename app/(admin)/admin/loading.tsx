import { Skeleton } from "@/components/ui/skeleton";

/** Dashboard loading skeleton (spec §11 UX — skeleton loaders on lists).
 *  Mirrors the real page: 6-tile stat grid at the contract breakpoints and
 *  section cards, inside the layout's own max-w-7xl container. */
export default function AdminLoading() {
  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-36 rounded-md" />
        ))}
      </div>
      <Skeleton className="h-64 rounded-md" />
      <Skeleton className="h-64 rounded-md" />
    </div>
  );
}
