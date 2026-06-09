// Minimal CSV parser + header auto-mapper for customer import.

export type CsvRow = Record<string, string>;

export function parseCsv(text: string): { headers: string[]; rows: CsvRow[] } {
  // Strip BOM
  const src = text.replace(/^\uFEFF/, "");
  const cells: string[][] = [];
  let row: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (inQuotes) {
      if (ch === '"') {
        if (src[i + 1] === '"') { cur += '"'; i++; }
        else inQuotes = false;
      } else cur += ch;
    } else {
      if (ch === '"') inQuotes = true;
      else if (ch === ",") { row.push(cur); cur = ""; }
      else if (ch === "\r") { /* skip */ }
      else if (ch === "\n") { row.push(cur); cells.push(row); row = []; cur = ""; }
      else cur += ch;
    }
  }
  if (cur.length > 0 || row.length > 0) { row.push(cur); cells.push(row); }
  // Filter trailing empty lines
  const clean = cells.filter((r) => r.some((c) => c.trim() !== ""));
  if (clean.length === 0) return { headers: [], rows: [] };
  const headers = clean[0].map((h) => h.trim());
  const rows = clean.slice(1).map((r) => {
    const obj: CsvRow = {};
    headers.forEach((h, i) => { obj[h] = (r[i] ?? "").trim(); });
    return obj;
  });
  return { headers, rows };
}

export type FieldKey = "full_name" | "phone" | "email" | "company" | "notes" | "";

const PATTERNS: Record<Exclude<FieldKey, "">, RegExp[]> = {
  full_name: [/^(full[\s_-]?name|name|họ[\s_-]?(và[\s_-]?)?tên|ho[\s_-]?(va[\s_-]?)?ten|tên|ten)$/i],
  phone: [/^(phone|mobile|tel|sdt|sđt|số[\s_-]?điện[\s_-]?thoại|so[\s_-]?dien[\s_-]?thoai|điện[\s_-]?thoại)$/i],
  email: [/^(e[\s_-]?mail|mail|địa[\s_-]?chỉ[\s_-]?email)$/i],
  company: [/^(company|công[\s_-]?ty|cong[\s_-]?ty|organization|org|doanh[\s_-]?nghiệp)$/i],
  notes: [/^(notes?|ghi[\s_-]?chú|ghi[\s_-]?chu|note|description|mô[\s_-]?tả)$/i],
};

export function autoMap(headers: string[]): Record<string, FieldKey> {
  const map: Record<string, FieldKey> = {};
  const used = new Set<FieldKey>();
  for (const h of headers) {
    let matched: FieldKey = "";
    for (const key of Object.keys(PATTERNS) as Array<Exclude<FieldKey, "">>) {
      if (used.has(key)) continue;
      if (PATTERNS[key].some((re) => re.test(h.trim()))) { matched = key; break; }
    }
    if (matched) used.add(matched);
    map[h] = matched;
  }
  return map;
}
