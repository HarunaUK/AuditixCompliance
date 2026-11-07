/**
 * CSV helpers shared by the register exports, the import actions and the
 * auditor package. Everything is RFC 4180-shaped: quoted fields may contain
 * commas, quotes and newlines, which matters because policy bodies are pasted
 * into cells.
 */

export function csvCell(value: unknown): string {
  const text = value == null ? "" : String(value);
  return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

export function toCsv(header: string[], rows: unknown[][]): string {
  return [header, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n");
}

/**
 * Parses a CSV document into rows of cells. Handles CRLF, a leading BOM,
 * quoted fields with embedded separators and doubled quotes.
 */
export function parseCsv(input: string): string[][] {
  const text = input.replace(/^\uFEFF/, "");
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];

    if (quoted) {
      if (char === '"') {
        if (text[index + 1] === '"') {
          cell += '"';
          index += 1;
        } else {
          quoted = false;
        }
      } else {
        cell += char;
      }
      continue;
    }

    if (char === '"') {
      quoted = true;
    } else if (char === ",") {
      row.push(cell);
      cell = "";
    } else if (char === "\n") {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else if (char !== "\r") {
      cell += char;
    }
  }

  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }

  return rows.filter((line) => line.some((value) => value.trim() !== ""));
}

/** Header names are matched loosely: "Review due", "review_due" and "ReviewDue" all normalize alike. */
export function normaliseHeader(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

export function toRecord(header: string[], row: string[]) {
  const record = new Map<string, string>();
  header.forEach((name, index) => {
    record.set(normaliseHeader(name), (row[index] ?? "").trim());
  });
  return record;
}

export function parseDay(value: string | undefined) {
  if (!value) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const date = new Date(`${match[1]}-${match[2]}-${match[3]}T12:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function csvFile(name: string, csv: string) {
  return new Response(`\uFEFF${csv}`, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${name}"`,
      "cache-control": "no-store",
    },
  });
}
