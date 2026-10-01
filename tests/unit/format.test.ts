import { describe, expect, it } from "vitest";
import { csvEscape, formatDate, formatDateTime, humanize, initials, slugify, toCsv } from "@/lib/format";

describe("formatting helpers", () => {
  it("initials takes the first two name parts", () => {
    expect(initials("Priya Sharma")).toBe("PS");
    expect(initials("Meera")).toBe("M");
    expect(initials(null)).toBe("?");
    expect(initials("   ")).toBe("?");
  });

  it("formatDate renders a friendly date", () => {
    expect(formatDate("2026-10-02")).toBe("2 Oct 2026");
    expect(formatDate(null)).toBe("—");
    expect(formatDate("not-a-date")).toBe("—");
  });

  it("formatDateTime includes time", () => {
    const out = formatDateTime("2026-10-02T14:05:00Z");
    expect(out).toMatch(/2 Oct 2026/);
    expect(out).toMatch(/\d{2}:\d{2}/);
  });

  it("humanize capitalizes statuses", () => {
    expect(humanize("pending")).toBe("Pending");
    expect(humanize(null)).toBe("—");
  });

  it("csvEscape wraps fields with commas or quotes", () => {
    expect(csvEscape("plain")).toBe("plain");
    expect(csvEscape("has,comma")).toBe('"has,comma"');
    expect(csvEscape('has "quote"')).toBe('"has ""quote"""');
    expect(csvEscape("line\nbreak")).toBe('"line\nbreak"');
    expect(csvEscape(null)).toBe("");
    expect(csvEscape(123)).toBe("123");
  });

  it("toCsv joins rows with CRLF", () => {
    const csv = toCsv([
      ["A", "B"],
      ['say "hi"', "x"],
    ]);
    expect(csv).toBe('A,B\r\n"say ""hi""",x');
  });

  it("slugify builds safe filenames", () => {
    expect(slugify("River Clean-Up Drive!")).toBe("river-clean-up-drive");
    expect(slugify("")).toBe("campaign");
  });
});
