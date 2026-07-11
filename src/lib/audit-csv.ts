// Pure helpers for audit-log CSV export.
// Extracted from src/routes/_app.files.tsx so we can unit-test the
// invariant "CSV always carries batch_id + phase matching displayed status".

export type ZipPhase = "zipping" | "done" | "canceled" | "error";

export function getZipPhase(diff: any): ZipPhase {
  const p = diff?.phase;
  if (p === "zipping" || p === "done" || p === "canceled" || p === "error") return p;
  if (diff?.canceled) return "canceled";
  if ((diff?.ok ?? 0) === 0 && (diff?.requested ?? 0) > 0) return "error";
  return "done";
}

export function csvEscape(v: unknown): string {
  const s = v === null || v === undefined ? "" : String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** Parse a single CSV line respecting doubled-quote escaping. */
export function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inQ) {
      if (c === '"') {
        if (line[i + 1] === '"') { cur += '"'; i++; }
        else { inQ = false; }
      } else { cur += c; }
    } else {
      if (c === ",") { out.push(cur); cur = ""; }
      else if (c === '"') { inQ = true; }
      else { cur += c; }
    }
  }
  out.push(cur);
  return out;
}

export type AuditRowLike = {
  action: string;
  batch_id?: string | null;
  diff?: any;
};

export type CsvValidationError = {
  index: number;
  batch_id: string;
  reason: "missing_batch_id" | "phase_mismatch" | "batch_id_mismatch";
  expected?: string;
  got?: string;
};

/**
 * Validate that the CSV string encodes, for every `file.bulk_download` row:
 *   - a non-empty `batch_id` column equal to `row.batch_id`
 *   - a `phase` column equal to `getZipPhase(row.diff)` (the value shown in the UI badge)
 *
 * Headers must include "action", "phase", "batch_id".
 */
export function validateAuditCsv(
  csv: string,
  rows: AuditRowLike[],
): { ok: boolean; errors: CsvValidationError[] } {
  const errors: CsvValidationError[] = [];
  // Strip UTF-8 BOM if present.
  const clean = csv.replace(/^\uFEFF/, "");
  const lines = clean.split(/\r\n|\n/);
  if (lines.length < 1) return { ok: false, errors: [{ index: -1, batch_id: "", reason: "missing_batch_id" }] };
  const header = parseCsvLine(lines[0]);
  const iAction = header.indexOf("action");
  const iPhase = header.indexOf("phase");
  const iBatch = header.indexOf("batch_id");
  if (iAction < 0 || iPhase < 0 || iBatch < 0) {
    return { ok: false, errors: [{ index: -1, batch_id: "", reason: "missing_batch_id" }] };
  }
  // Data rows align 1:1 with input rows.
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (row.action !== "file.bulk_download") continue;
    const cols = parseCsvLine(lines[i + 1] ?? "");
    const expectedPhase = getZipPhase(row.diff);
    const gotPhase = cols[iPhase] ?? "";
    const expectedBatch = row.batch_id ?? "";
    const gotBatch = cols[iBatch] ?? "";
    if (!expectedBatch || !gotBatch) {
      errors.push({ index: i, batch_id: expectedBatch, reason: "missing_batch_id", expected: expectedBatch, got: gotBatch });
      continue;
    }
    if (gotBatch !== expectedBatch) {
      errors.push({ index: i, batch_id: expectedBatch, reason: "batch_id_mismatch", expected: expectedBatch, got: gotBatch });
    }
    if (gotPhase !== expectedPhase) {
      errors.push({ index: i, batch_id: expectedBatch, reason: "phase_mismatch", expected: expectedPhase, got: gotPhase });
    }
  }
  return { ok: errors.length === 0, errors };
}
