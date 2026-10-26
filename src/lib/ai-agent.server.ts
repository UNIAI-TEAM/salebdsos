// Trợ lý AI điều hành: model gọi công cụ tra cứu số liệu CRM qua client theo người dùng (RLS áp dụng).
import { createOpenAI } from "@ai-sdk/openai";
import { streamText, tool, stepCountIs, type ModelMessage } from "ai";
import { z } from "zod";
import { agingBucket, daysOverdue } from "@/lib/debt-aging";
import { agentHistory, readAgentRows, scopeAgentContracts } from "./ai-agent-data";
import { LISTING_STATUSES, PROPERTY_KINDS } from "./property-types";

const MODEL = "openai/gpt-6-astra";
const GATEWAY = "https://ai.gateway.lovable.dev/v1";
const STATUS_VI: Record<string, string> = {
  available: "Còn trống", locked: "Khoá", reserved: "Giữ chỗ", negotiating: "Đàm phán",
  deposited: "Đặt cọc", contracted: "Ký HĐMB", sold: "Đã bán", liquidated: "Thanh lý",
};

type Ctx = { supabase: any; tenantId: string; userId: string; canManage: boolean };

const today = () => new Date(Date.now() + 7 * 3600_000).toISOString().slice(0, 10);

async function projectsMatching(ctx: Ctx, name?: string | null) {
  let q = ctx.supabase.from("projects").select("id,name").eq("tenant_id", ctx.tenantId).is("deleted_at", null);
  if (name) q = q.ilike("name", `%${name.replace(/[%,()*\\]/g, "")}%`);
  const data = await readAgentRows(q.order("id"));
  return data as { id: string; name: string }[];
}

function buildTools(ctx: Ctx) {
  return {
    revenue_summary: tool({
      description: "Doanh số: số hợp đồng, giá trị hợp đồng, tiền đã thu, hoa hồng trong N tháng gần nhất, chia theo dự án và tháng.",
      inputSchema: z.object({
        months: z.number().describe("Số tháng gần nhất, 1-24"),
        projectName: z.string().nullable().describe("Tên dự án (một phần), null = tất cả"),
      }),
      execute: async ({ months, projectName }) => {
        const m = Math.min(24, Math.max(1, Math.round(months || 3)));
        const projects = await projectsMatching(ctx, projectName);
        const pName = new Map(projects.map((p) => [p.id, p.name]));
        const now = new Date();
        const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (m - 1), 1)).toISOString();
        let q = ctx.supabase.from("contracts").select("id,project_id,net_price,created_at,owner_user_id")
          .eq("tenant_id", ctx.tenantId).is("deleted_at", null).in("status", ["active", "completed"]).gte("created_at", start);
        if (projectName) q = q.in("project_id", projects.map((p) => p.id).concat("00000000-0000-0000-0000-000000000000"));
        q = scopeAgentContracts(q, ctx);
        const cs = await readAgentRows(q.order("id"));
        const ids = (cs ?? []).map((c: any) => c.id);
        const [ins, com] = ids.length
          ? await Promise.all([
              readAgentRows(ctx.supabase.from("contract_installments").select("contract_id,paid_amount").eq("tenant_id", ctx.tenantId).in("contract_id", ids).order("id")),
              readAgentRows(ctx.supabase.from("contract_commissions").select("contract_id,amount").eq("tenant_id", ctx.tenantId).in("contract_id", ids).order("id")),
            ])
          : [[], []];
        const paid = new Map<string, number>();
        for (const i of ins ?? []) paid.set(i.contract_id, (paid.get(i.contract_id) ?? 0) + Number(i.paid_amount ?? 0));
        const comm = new Map<string, number>();
        for (const c of com ?? []) comm.set(c.contract_id, (comm.get(c.contract_id) ?? 0) + Number(c.amount ?? 0));
        const byProject: Record<string, any> = {};
        const byMonth: Record<string, any> = {};
        const total = { contracts: 0, value: 0, collected: 0, commission: 0 };
        for (const c of cs ?? []) {
          const v = Number(c.net_price ?? 0), p = paid.get(c.id) ?? 0, k = comm.get(c.id) ?? 0;
          for (const [map, key] of [[byProject, pName.get(c.project_id) ?? "Khác"], [byMonth, c.created_at.slice(0, 7)]] as const) {
            map[key] ??= { contracts: 0, value: 0, collected: 0 };
            map[key].contracts++; map[key].value += v; map[key].collected += p;
          }
          total.contracts++; total.value += v; total.collected += p; total.commission += k;
        }
        return { scope: ctx.canManage ? "toàn sàn" : "của tôi", basis: "Hợp đồng được tạo trong kỳ; tiền đã thu là lũy kế của các hợp đồng đó, không phải dòng tiền nhận trong từng tháng", months: m, currency: "VND", total, byProject, byMonth };
      },
    }),
    list_available_units: tool({
      description: "Danh sách căn/lô theo trạng thái (mặc định còn trống) trong giỏ hàng, lọc theo dự án, loại hình, giá tối đa.",
      inputSchema: z.object({
        projectName: z.string().nullable(),
        status: z.enum(LISTING_STATUSES).nullable().describe("null = còn trống"),
        kind: z.enum(PROPERTY_KINDS).nullable(),
        maxPrice: z.number().nullable().describe("Giá tối đa VND"),
        limit: z.number().nullable(),
      }),
      execute: async ({ projectName, status, kind, maxPrice, limit }) => {
        const projects = await projectsMatching(ctx, projectName);
        const pName = new Map(projects.map((p) => [p.id, p.name]));
        let q = ctx.supabase.from("products")
          .select("code,name,price,area,bedrooms,direction,floor,zone,product_type,listing_status,project_id", { count: "exact" })
          .eq("tenant_id", ctx.tenantId).eq("listing_status", status ?? "available").order("price");
        if (projectName) q = q.in("project_id", projects.map((p) => p.id).concat("00000000-0000-0000-0000-000000000000"));
        if (kind) q = q.eq("product_type", kind);
        if (maxPrice != null) q = q.lte("price", maxPrice);
        const { data, count, error } = await q.limit(Math.min(50, Math.max(1, limit ?? 20)));
        if (error || !data) throw new Error("Không thể tra cứu giỏ hàng lúc này.");
        return {
          total: count ?? 0,
          units: (data ?? []).map((u: any) => ({
            code: u.code ?? u.name, project: pName.get(u.project_id) ?? null, price: Number(u.price), area: u.area,
            bedrooms: u.bedrooms, direction: u.direction, floor: u.floor, zone: u.zone, status: STATUS_VI[u.listing_status],
          })),
        };
      },
    }),
    project_progress: tool({
      description: "Tiến độ bán hàng từng dự án: số căn theo trạng thái, tỷ lệ đã bán, số hợp đồng, giá trị và tiền đã thu.",
      inputSchema: z.object({ projectName: z.string().nullable() }),
      execute: async ({ projectName }) => {
        const projects = await projectsMatching(ctx, projectName);
        const ids = projects.map((p) => p.id);
        if (!ids.length) return { projects: [] };
        const [pr, cs] = await Promise.all([
          readAgentRows(ctx.supabase.from("products").select("project_id,listing_status").eq("tenant_id", ctx.tenantId).not("product_type", "is", null).in("project_id", ids).order("id")),
          readAgentRows(scopeAgentContracts(ctx.supabase.from("contracts").select("id,project_id,net_price").eq("tenant_id", ctx.tenantId).is("deleted_at", null)
            .in("status", ["active", "completed"]).in("project_id", ids), ctx).order("id")),
        ]);
        const cids = (cs ?? []).map((c: any) => c.id);
        const ins = cids.length ? await readAgentRows(ctx.supabase.from("contract_installments").select("contract_id,paid_amount").eq("tenant_id", ctx.tenantId).in("contract_id", cids).order("id")) : [];
        const cProj = new Map((cs ?? []).map((c: any) => [c.id, c.project_id]));
        const out = projects.map((p) => {
          const units = (pr ?? []).filter((u: any) => u.project_id === p.id);
          const byStatus: Record<string, number> = {};
          for (const u of units) byStatus[STATUS_VI[u.listing_status] ?? u.listing_status] = (byStatus[STATUS_VI[u.listing_status] ?? u.listing_status] ?? 0) + 1;
          const sold = units.filter((u: any) => ["deposited", "contracted", "sold"].includes(u.listing_status)).length;
          const pcs = (cs ?? []).filter((c: any) => c.project_id === p.id);
          const collected = (ins ?? []).filter((i: any) => cProj.get(i.contract_id) === p.id).reduce((s: number, i: any) => s + Number(i.paid_amount ?? 0), 0);
          return {
            project: p.name, units: units.length, byStatus, soldRate: units.length ? Math.round((sold / units.length) * 1000) / 10 : 0,
            contracts: pcs.length, contractValue: pcs.reduce((s: number, c: any) => s + Number(c.net_price ?? 0), 0), collected,
          };
        });
        return { inventoryScope: "giỏ hàng dự án", financialScope: ctx.canManage ? "toàn sàn" : "chỉ hợp đồng của tôi", projects: out };
      },
    }),
    debt_overview: tool({
      description: "Công nợ: tổng còn nợ theo nhóm tuổi nợ (chưa đến hạn, đến hạn, quá hạn 1-15, 16-30, >30 ngày) và các đợt quá hạn lớn nhất.",
      inputSchema: z.object({ projectName: z.string().nullable() }),
      execute: async ({ projectName }) => {
        const projects = await projectsMatching(ctx, projectName);
        let q = ctx.supabase.from("contracts").select("id,code,project_id").eq("tenant_id", ctx.tenantId).is("deleted_at", null).in("status", ["draft", "active"]);
        if (projectName) q = q.in("project_id", projects.map((p) => p.id).concat("00000000-0000-0000-0000-000000000000"));
        q = scopeAgentContracts(q, ctx);
        const cs = await readAgentRows(q.order("id"));
        const code = new Map((cs ?? []).map((c: any) => [c.id, c.code]));
        if (!code.size) return { buckets: {}, overdue: [] };
        const ins = await readAgentRows(ctx.supabase.from("contract_installments").select("contract_id,name,amount,paid_amount,due_date").eq("tenant_id", ctx.tenantId).in("contract_id", [...code.keys()]).order("id"));
        const t = today();
        const buckets: Record<string, number> = {};
        const overdue: any[] = [];
        for (const i of ins ?? []) {
          const left = Number(i.amount) - Number(i.paid_amount ?? 0);
          if (left <= 0) continue;
          const b = agingBucket(i.due_date, t);
          buckets[b] = (buckets[b] ?? 0) + left;
          if (i.due_date && daysOverdue(i.due_date, t) > 0) overdue.push({ contract: code.get(i.contract_id), installment: i.name, outstanding: left, daysOverdue: daysOverdue(i.due_date, t) });
        }
        overdue.sort((a, b) => b.outstanding - a.outstanding);
        return { buckets, overdue: overdue.slice(0, 10) };
      },
    }),
  };
}

export async function runAgent(ctx: Ctx, messages: { role: "user" | "assistant"; content: string }[]) {
  const apiKey = process.env.LOVABLE_API_KEY;
  if (!apiKey) throw new Error("Chưa cấu hình AI");
  const provider = createOpenAI({
    baseURL: GATEWAY, apiKey,
    headers: { "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
  });
  let streamError: unknown;
  const result = streamText({
    onError: ({ error }) => { streamError = error; },
    model: provider.responses(MODEL),
    instructions:
      `Bạn là trợ lý điều hành của sàn bất động sản. Hôm nay ${today()}. Trả lời tiếng Việt, ngắn gọn, dùng gạch đầu dòng hoặc bảng markdown. ` +
      `Luôn gọi công cụ để lấy số liệu thật, không bịa số. Tiền hiển thị dạng "2,9 tỷ" hoặc "870 triệu". ` +
      (ctx.canManage ? "Người hỏi là quản lý: số liệu toàn sàn." : "Người hỏi là chuyên viên: doanh số và công nợ chỉ của họ."),
    messages: agentHistory(messages).map((m) => ({ role: m.role, content: m.content.slice(0, 2000) })) as ModelMessage[],
    tools: buildTools(ctx),
    stopWhen: stepCountIs(50),
    providerOptions: {
      openai: { forceReasoning: true, reasoningEffort: "low", reasoningSummary: "auto", store: false, include: ["reasoning.encrypted_content"] },
    },
  });
  let text: string;
  let steps;
  try {
    text = await result.text;
    steps = await result.steps;
  } catch (error) {
    throw streamError ?? error;
  }
  if (streamError) throw streamError;
  const failedTool = steps.flatMap((step) => step.content).find((part) => part.type === "tool-error");
  if (failedTool) throw new Error("Không thể tra cứu đầy đủ dữ liệu lúc này. Vui lòng thử lại sau.");
  if (!text.trim()) throw new Error("AI chưa trả về câu trả lời. Vui lòng thử lại sau.");
  const used = [...new Set(steps.flatMap((s) => s.toolCalls.map((c) => c.toolName)))];
  return { text, tools: used };
}
