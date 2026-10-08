/** Formatting + small display helpers shared across pages. */

export function initials(name: string | null | undefined): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() ?? "").join("") || "?";
}

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

export function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  const d = new Date(value + (value.length === 10 ? "T00:00:00" : ""));
  if (Number.isNaN(d.getTime())) return "—";
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${formatDate(value)} · ${hh}:${mm}`;
}

export function formatTime(value: string | null | undefined): string {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

/** Tailwind tone classes for status chips — one semantic language across the app:
 *  positive = live/done, info = planned/invited, warning = awaiting,
 *  danger = blocked/rejected, neutral = archived/type meta. */
export const STATUS_TONES: Record<string, string> = {
  upcoming: "bg-status-info/10 text-status-info border-status-info/35",
  ongoing: "bg-status-positive/10 text-status-positive border-status-positive/35",
  completed: "bg-status-neutral/10 text-status-neutral border-status-neutral/30",
  cancelled: "bg-status-danger/10 text-status-danger border-status-danger/35",
  pending: "bg-status-warning/10 text-status-warning border-status-warning/35",
  approved: "bg-status-positive/10 text-status-positive border-status-positive/35",
  rejected: "bg-status-danger/10 text-status-danger border-status-danger/35",
  accepted: "bg-status-positive/10 text-status-positive border-status-positive/35",
  declined: "bg-status-danger/10 text-status-danger border-status-danger/35",
  invited: "bg-status-info/10 text-status-info border-status-info/35",
  suspended: "bg-status-danger/10 text-status-danger border-status-danger/35",
  active: "bg-status-positive/10 text-status-positive border-status-positive/35",
  open: "bg-status-warning/10 text-status-warning border-status-warning/35",
  reviewed: "bg-status-positive/10 text-status-positive border-status-positive/35",
  dismissed: "bg-status-neutral/10 text-status-neutral border-status-neutral/30",
  paid: "bg-status-positive/10 text-status-positive border-status-positive/35",
  public: "bg-status-neutral/10 text-status-neutral border-status-neutral/30",
  invite: "bg-status-info/10 text-status-info border-status-info/35",
};

export function statusTone(status: string | null | undefined): string {
  return STATUS_TONES[status ?? ""] ?? "bg-status-neutral/10 text-status-neutral border-status-neutral/30";
}

export function humanize(status: string | null | undefined): string {
  if (!status) return "—";
  return status.charAt(0).toUpperCase() + status.slice(1);
}

/** CSV helpers (spec §8 export route). */
export function csvEscape(value: unknown): string {
  const s = value === null || value === undefined ? "" : String(value);
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export function toCsv(rows: Array<Array<unknown>>): string {
  return rows.map((row) => row.map(csvEscape).join(",")).join("\r\n");
}

export function slugify(text: string): string {
  return (
    text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "campaign"
  );
}
