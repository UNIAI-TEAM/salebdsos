import { describe, expect, it } from "vitest";
import { agentHistory, readAgentRows, scopeAgentContracts } from "./ai-agent-data";

describe("executive assistant safeguards", () => {
  it("restricts Sale contract queries to their own owner on every tool", () => {
    const filters: unknown[] = [];
    const query = { eq(column: string, value: string) { filters.push([column, value]); return this; } };
    scopeAgentContracts(query, { canManage: false, userId: "sale-1" });
    expect(filters).toEqual([["owner_user_id", "sale-1"]]);
  });
  it("allows managers to retain team contract scope", () => {
    const filters: unknown[] = [];
    const query = { eq(column: string, value: string) { filters.push([column, value]); return this; } };
    scopeAgentContracts(query, { canManage: true, userId: "manager-1" });
    expect(filters).toEqual([]);
  });
  it("does not report zero records when a query fails", async () => {
    await expect(readAgentRows({ range: async () => ({ data: null, error: { message: "failure" } }) })).rejects.toThrow("Không thể tra cứu dữ liệu");
  });
  it("reads beyond the first page instead of understating totals", async () => {
    const records = Array.from({ length: 1001 }, (_, id) => ({ id }));
    const rows = await readAgentRows({ range: async (start: number, end: number) => ({ data: records.slice(start, end + 1), error: null }) });
    expect(rows).toHaveLength(1001);
    expect(rows[1000].id).toBe(1000);
  });
  it("keeps later questions sendable after twenty exchanges", () => {
    const messages = Array.from({ length: 41 }, (_, i) => ({ role: i % 2 ? "assistant" as const : "user" as const, content: String(i) }));
    expect(agentHistory(messages)).toHaveLength(12);
    expect(agentHistory(messages).at(-1)?.content).toBe("40");
  });
});