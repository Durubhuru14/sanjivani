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

/** Tailwind tone classes for status chips (Neo Kinpaku: patina = positive, gold = pending, vermilion = warning). */
export const STATUS_TONES: Record<string, string> = {
  upcoming: "bg-kinpaku/10 text-kinpaku border-kinpaku/30",
  ongoing: "bg-patina/12 text-patina border-patina/35",
  completed: "bg-muted text-champagne/90 border-border",
  cancelled: "bg-vermilion/12 text-vermilion border-vermilion/35",
  pending: "bg-kinpaku/10 text-kinpaku border-kinpaku/30",
  approved: "bg-patina/12 text-patina border-patina/35",
  rejected: "bg-vermilion/12 text-vermilion border-vermilion/35",
  accepted: "bg-patina/12 text-patina border-patina/35",
  declined: "bg-vermilion/12 text-vermilion border-vermilion/35",
  invited: "bg-kinpaku/10 text-kinpaku border-kinpaku/30",
  active: "bg-patina/12 text-patina border-patina/35",
  open: "bg-kinpaku/10 text-kinpaku border-kinpaku/30",
  reviewed: "bg-patina/12 text-patina border-patina/35",
  dismissed: "bg-muted text-champagne/90 border-border",
  paid: "bg-patina/12 text-patina border-patina/35",
  public: "bg-muted text-champagne/90 border-border",
  invite: "bg-patina/12 text-patina-deep border-patina/30",
};

export function statusTone(status: string | null | undefined): string {
  return STATUS_TONES[status ?? ""] ?? "bg-muted text-champagne/90 border-border";
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
