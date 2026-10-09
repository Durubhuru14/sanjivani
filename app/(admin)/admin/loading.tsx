import { Skeleton } from "@/components/ui/skeleton";

/** Admin loading skeleton (spec §11 UX — skeleton loaders on lists).
 *  Neutral shape that reads correctly on the overview (header + stat row +
 *  queue cards) and on every directory page (header + toolbar + list card). */
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
      <Skeleton className="h-10 w-full max-w-md rounded-lg" />
      <Skeleton className="h-64 rounded-md" />
      <Skeleton className="h-64 rounded-md" />
    </div>
  );
}
