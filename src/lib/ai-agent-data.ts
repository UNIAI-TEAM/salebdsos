// Shared safeguards for every executive-assistant data tool.
export function scopeAgentContracts<T extends { eq: (column: string, value: string) => T }>(query: T, context: { canManage: boolean; userId: string }): T {
  return context.canManage ? query : query.eq("owner_user_id", context.userId);
}

export async function readAgentRows(query: any): Promise<any[]> {
  const rows: any[] = [];
  const pageSize = 500;
  for (let offset = 0; ; offset += pageSize) {
    const { data, error } = await query.range(offset, offset + pageSize - 1);
    if (error) throw new Error("Không thể tra cứu dữ liệu lúc này. Vui lòng thử lại sau.");
    if (!Array.isArray(data)) throw new Error("Không thể tra cứu dữ liệu lúc này. Vui lòng thử lại sau.");
    rows.push(...data);
    if (data.length < pageSize) return rows;
  }
}

export function agentHistory<T extends { role: "user" | "assistant"; content: string }>(messages: T[]): T[] {
  return messages.slice(-12);
}