import Link from "next/link";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";

/** Status filter chip used by the admin directory toolbars. */
function StatusChip({
  href,
  label,
  count,
  active,
}: {
  href: string;
  label: string;
  count?: number;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "true" : undefined}
      className={cn(
        "inline-flex h-8 items-center gap-1.5 whitespace-nowrap rounded-full border px-3.5 text-sm font-medium transition-all duration-200",
        active
          ? "border-primary/40 bg-primary/10 text-primary"
          : "bg-card text-muted-foreground hover:border-primary/30 hover:text-foreground",
        // zero-count facets stay reachable but recede — they are roads with
        // nothing at the end of them today, not clutter to delete
        !active && count === 0 && "opacity-50 hover:opacity-100"
      )}
    >
      {label}
      {typeof count === "number" ? (
        <span className={cn("text-xs tabular-nums", active ? "text-primary/80" : "text-muted-foreground/70")}>
          {count}
        </span>
      ) : null}
    </Link>
  );
}

function buildHref(base: string, q: string, status: string, page: number) {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (status && status !== "all") params.set("status", status);
  if (page > 1) params.set("page", String(page));
  const qs = params.toString();
  return qs ? `${base}?${qs}` : base;
}

/**
 * Server-rendered toolbar for the admin directory pages: a GET-form search
 * box (works without JS) plus status filter chips that preserve the query.
 * All state lives in the URL — shareable, back-button-safe, SSR-friendly.
 */
export function AdminToolbar({
  basePath,
  q = "",
  status = "all",
  statuses,
  total,
  shown,
}: {
  basePath: string;
  q?: string;
  status?: string;
  /** [{value,label,count}] — "all" is always prepended automatically. */
  statuses: Array<{ value: string; label: string; count?: number }>;
  total: number;
  shown: number;
}) {
  const all = [{ value: "all", label: "All", count: total }, ...statuses];

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <form action={basePath} method="get" className="relative w-full sm:max-w-xs" role="search">
          {status && status !== "all" ? (
            <input type="hidden" name="status" value={status} />
          ) : null}
          <Search
            className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <input
            type="search"
            name="q"
            defaultValue={q}
            placeholder="Search…"
            aria-label="Search"
            className="h-9 w-full rounded-full border bg-card pl-9 pr-4 text-sm shadow-soft outline-none transition-colors placeholder:text-muted-foreground/70 focus-visible:border-primary/50 focus-visible:ring-2 focus-visible:ring-primary/20"
          />
        </form>
        <p className="text-sm text-muted-foreground sm:ml-auto sm:text-right">
          {q || (status && status !== "all") ? `${shown} of ${total} shown` : `${total} total`}
        </p>
      </div>
      <div className="flex items-center gap-2 overflow-x-auto sm:flex-wrap [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {all.map((s) => (
          <StatusChip
            key={s.value}
            href={buildHref(basePath, q, s.value, 1)}
            label={s.label}
            count={s.count}
            active={status === s.value || (!status && s.value === "all")}
          />
        ))}
      </div>
    </div>
  );
}

/** URL-driven prev/next pagination for the admin directories. */
export function AdminPagination({
  basePath,
  q = "",
  status = "all",
  page,
  pageCount,
}: {
  basePath: string;
  q?: string;
  status?: string;
  page: number;
  pageCount: number;
}) {
  if (pageCount <= 1) return null;
  const prev = page > 1 ? buildHref(basePath, q, status, page - 1) : null;
  const next = page < pageCount ? buildHref(basePath, q, status, page + 1) : null;

  return (
    <nav aria-label="Pagination" className="flex items-center justify-between gap-3 pt-1">
      {prev ? (
        <Link
          href={prev}
          className="inline-flex h-9 items-center rounded-full border bg-card px-4 text-sm font-medium text-muted-foreground shadow-soft transition-colors hover:text-foreground"
        >
          ← Previous
        </Link>
      ) : (
        <span className="inline-flex h-9 cursor-not-allowed items-center rounded-full border px-4 text-sm text-muted-foreground/40">
          ← Previous
        </span>
      )}
      <p className="text-sm text-muted-foreground tabular-nums">
        Page {page} of {pageCount}
      </p>
      {next ? (
        <Link
          href={next}
          className="inline-flex h-9 items-center rounded-full border bg-card px-4 text-sm font-medium text-muted-foreground shadow-soft transition-colors hover:text-foreground"
        >
          Next →
        </Link>
      ) : (
        <span className="inline-flex h-9 cursor-not-allowed items-center rounded-full border px-4 text-sm text-muted-foreground/40">
          Next →
        </span>
      )}
    </nav>
  );
}

/** Shared page-size for every admin directory. */
export const ADMIN_PAGE_SIZE = 20;

/** Parse the directory search params (q / status / page) safely. */
export function parseDirParams(
  sp: Record<string, string | string[] | undefined>,
  allowedStatuses: string[]
): { q: string; status: string; page: number } {
  const rawQ = Array.isArray(sp.q) ? sp.q[0] : sp.q;
  const rawStatus = Array.isArray(sp.status) ? sp.status[0] : sp.status;
  const rawPage = Array.isArray(sp.page) ? sp.page[0] : sp.page;
  const q = (rawQ ?? "").trim().slice(0, 100);
  const status = allowedStatuses.includes(rawStatus ?? "") ? (rawStatus as string) : "all";
  const page = Math.max(1, Math.min(999, Number.parseInt(rawPage ?? "1", 10) || 1));
  return { q, status, page };
}

/** Case-insensitive "any field contains" matcher for JS-side filtering. */
export function matchesQuery(q: string, ...fields: Array<string | null | undefined>): boolean {
  if (!q) return true;
  const needle = q.toLowerCase();
  return fields.some((f) => (f ?? "").toLowerCase().includes(needle));
}
