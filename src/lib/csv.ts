// Minimal CSV parser (RFC4180-ish): quoted fields, escaped quotes (""), commas
// and newlines inside quotes, CRLF tolerated. PURE module.

export function parseCsvRecords(text: string): string[][] {
  const records: string[][] = [];
  let field = "";
  let record: string[] = [];
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      record.push(field);
      field = "";
    } else if (c === "\n") {
      record.push(field);
      records.push(record);
      field = "";
      record = [];
    } else if (c !== "\r") {
      field += c;
    }
  }
  if (field.length > 0 || record.length > 0) {
    record.push(field);
    records.push(record);
  }
  // Drop fully-blank lines.
  return records.filter((r) => !(r.length === 1 && r[0].trim() === ""));
}

/** Serialize rows to RFC4180 CSV (quote fields containing , " or newlines). */
export function toCsv(rows: string[][]): string {
  const esc = (v: string) =>
    /[",\n\r]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
  return rows.map((r) => r.map(esc).join(",")).join("\r\n");
}

/** Parse CSV into header + objects keyed by (trimmed) header name. */
export function parseCsv(text: string): {
  headers: string[];
  rows: Record<string, string>[];
} {
  const recs = parseCsvRecords(text);
  if (recs.length === 0) return { headers: [], rows: [] };
  const headers = recs[0].map((h) => h.trim());
  const rows = recs.slice(1).map((r) => {
    const obj: Record<string, string> = {};
    headers.forEach((h, i) => {
      obj[h] = (r[i] ?? "").trim();
    });
    return obj;
  });
  return { headers, rows };
}
