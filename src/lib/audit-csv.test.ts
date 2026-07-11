import { describe, it, expect } from "vitest";
import { getZipPhase, csvEscape, parseCsvLine, validateAuditCsv } from "./audit-csv";

function buildCsv(header: string[], dataRows: (string | number)[][]): string {
  const escape = (v: unknown) => csvEscape(v);
  const lines = [header.map(escape).join(",")];
  for (const r of dataRows) lines.push(r.map(escape).join(","));
  return lines.join("\r\n");
}

const HEADER = [
  "occurred_at", "action", "action_label", "actor_name", "actor_email",
  "actor_user_id", "entity", "entity_id", "entity_name", "summary",
  "phase", "batch_id", "diff_json",
];

function rowCols(action: string, phase: string, batchId: string, diffJson: string) {
  return [
    "2026-07-11T00:00:00Z", action, "L", "", "", "", "file", "", "", "",
    phase, batchId, diffJson,
  ];
}

describe("getZipPhase", () => {
  it("returns explicit phase when present", () => {
    expect(getZipPhase({ phase: "zipping" })).toBe("zipping");
    expect(getZipPhase({ phase: "done" })).toBe("done");
    expect(getZipPhase({ phase: "canceled" })).toBe("canceled");
    expect(getZipPhase({ phase: "error" })).toBe("error");
  });
  it("infers canceled from flag", () => {
    expect(getZipPhase({ canceled: true })).toBe("canceled");
  });
  it("infers error when nothing succeeded", () => {
    expect(getZipPhase({ ok: 0, requested: 3 })).toBe("error");
  });
  it("defaults to done", () => {
    expect(getZipPhase({ ok: 2, requested: 2 })).toBe("done");
    expect(getZipPhase({})).toBe("done");
  });
});

describe("csvEscape / parseCsvLine", () => {
  it("quotes commas, quotes, newlines", () => {
    expect(csvEscape('a,b')).toBe('"a,b"');
    expect(csvEscape('he said "hi"')).toBe('"he said ""hi"""');
    expect(csvEscape("line\nbreak")).toBe('"line\nbreak"');
    expect(csvEscape("plain")).toBe("plain");
  });
  it("round-trips through parseCsvLine", () => {
    const values = ["plain", "a,b", 'he said "hi"', "line\nbreak", ""];
    const line = values.map(csvEscape).join(",");
    expect(parseCsvLine(line)).toEqual(values);
  });
});

describe("validateAuditCsv", () => {
  const rows = [
    { action: "file.bulk_download", batch_id: "A1B2C3", diff: { phase: "done", ok: 5, requested: 5 } },
    { action: "file.bulk_download", batch_id: "ZZZ999", diff: { phase: "error", ok: 0, requested: 3 } },
    { action: "file.update", batch_id: null, diff: {} },
  ];

  it("passes when phase and batch_id match displayed status", () => {
    const csv = buildCsv(HEADER, [
      rowCols("file.bulk_download", "done", "A1B2C3", JSON.stringify(rows[0].diff)),
      rowCols("file.bulk_download", "error", "ZZZ999", JSON.stringify(rows[1].diff)),
      rowCols("file.update", "", "", "{}"),
    ]);
    const res = validateAuditCsv(csv, rows);
    expect(res.ok).toBe(true);
    expect(res.errors).toEqual([]);
  });

  it("detects phase mismatch against getZipPhase(diff)", () => {
    const csv = buildCsv(HEADER, [
      rowCols("file.bulk_download", "zipping", "A1B2C3", JSON.stringify(rows[0].diff)), // wrong
      rowCols("file.bulk_download", "error", "ZZZ999", JSON.stringify(rows[1].diff)),
      rowCols("file.update", "", "", "{}"),
    ]);
    const res = validateAuditCsv(csv, rows);
    expect(res.ok).toBe(false);
    expect(res.errors.some((e) => e.reason === "phase_mismatch" && e.expected === "done" && e.got === "zipping")).toBe(true);
  });

  it("detects batch_id mismatch", () => {
    const csv = buildCsv(HEADER, [
      rowCols("file.bulk_download", "done", "WRONG1", JSON.stringify(rows[0].diff)),
      rowCols("file.bulk_download", "error", "ZZZ999", JSON.stringify(rows[1].diff)),
      rowCols("file.update", "", "", "{}"),
    ]);
    const res = validateAuditCsv(csv, rows);
    expect(res.ok).toBe(false);
    expect(res.errors[0].reason).toBe("batch_id_mismatch");
    expect(res.errors[0].expected).toBe("A1B2C3");
    expect(res.errors[0].got).toBe("WRONG1");
  });

  it("detects missing batch_id column for a ZIP row", () => {
    const csv = buildCsv(HEADER, [
      rowCols("file.bulk_download", "done", "", JSON.stringify(rows[0].diff)),
      rowCols("file.bulk_download", "error", "ZZZ999", JSON.stringify(rows[1].diff)),
      rowCols("file.update", "", "", "{}"),
    ]);
    const res = validateAuditCsv(csv, rows);
    expect(res.ok).toBe(false);
    expect(res.errors[0].reason).toBe("missing_batch_id");
  });

  it("fails when required headers are absent", () => {
    const badHeader = ["action", "phase"]; // no batch_id
    const csv = buildCsv(badHeader, [["file.bulk_download", "done"]]);
    const res = validateAuditCsv(csv, [{ action: "file.bulk_download", batch_id: "X", diff: { phase: "done" } }]);
    expect(res.ok).toBe(false);
  });

  it("tolerates the UTF-8 BOM prefix used by the Excel-friendly export", () => {
    const csv = "\uFEFF" + buildCsv(HEADER, [
      rowCols("file.bulk_download", "done", "A1B2C3", JSON.stringify(rows[0].diff)),
      rowCols("file.bulk_download", "error", "ZZZ999", JSON.stringify(rows[1].diff)),
      rowCols("file.update", "", "", "{}"),
    ]);
    expect(validateAuditCsv(csv, rows).ok).toBe(true);
  });

  it("ignores non-ZIP rows entirely", () => {
    const csv = buildCsv(HEADER, [
      rowCols("file.update", "", "", "{}"),
    ]);
    const res = validateAuditCsv(csv, [{ action: "file.update", batch_id: null, diff: {} }]);
    expect(res.ok).toBe(true);
  });
});
