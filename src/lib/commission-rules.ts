import { z } from "zod";

export const COMMISSION_RULES_KEY = "commission_rules";

const percent = z.number().min(0).max(100);

export const commissionRulesSchema = z.object({
  enabled: z.boolean().default(true),
  default_percent: percent.default(2),
  project_rules: z.array(z.object({ project_id: z.string().uuid(), percent })).max(60).default([]),
  team_rules: z.array(z.object({ team_id: z.string().uuid(), percent })).max(60).default([]),
  sale_rules: z.array(z.object({ user_id: z.string().uuid(), percent })).max(200).default([]),
  splits: z
    .object({
      sale: percent.default(70),
      team_lead: percent.default(10),
      manager: percent.default(10),
      company: percent.default(10),
    })
    .default({ sale: 70, team_lead: 10, manager: 10, company: 10 }),
  manager_user_id: z.string().uuid().nullable().default(null),
});

export type CommissionRules = z.infer<typeof commissionRulesSchema>;

export const DEFAULT_COMMISSION_RULES: CommissionRules = commissionRulesSchema.parse({});

export function parseCommissionRules(value: unknown): CommissionRules {
  const parsed = commissionRulesSchema.safeParse(value ?? {});
  return parsed.success ? parsed.data : DEFAULT_COMMISSION_RULES;
}

export const SPLIT_LABEL: Record<keyof CommissionRules["splits"], string> = {
  sale: "Sale chính",
  team_lead: "Trưởng nhóm",
  manager: "Quản lý sàn",
  company: "Quỹ sàn",
};

export type ResolvedPercent = { percent: number; source: string };

/** Ưu tiên: ghi đè tay → theo từng sale → theo nhóm → theo dự án → mặc định */
export function resolveCommissionPercent(
  rules: CommissionRules,
  ctx: { projectId?: string | null; teamId?: string | null; userId?: string | null; overridePercent?: number | null },
): ResolvedPercent {
  if (ctx.overridePercent != null && ctx.overridePercent > 0) {
    return { percent: ctx.overridePercent, source: "Ghi đè khi lập hợp đồng" };
  }
  const bySale = ctx.userId ? rules.sale_rules.find((r) => r.user_id === ctx.userId) : undefined;
  if (bySale) return { percent: bySale.percent, source: "Chính sách riêng của sale" };
  const byTeam = ctx.teamId ? rules.team_rules.find((r) => r.team_id === ctx.teamId) : undefined;
  if (byTeam) return { percent: byTeam.percent, source: "Chính sách theo nhóm" };
  const byProject = ctx.projectId ? rules.project_rules.find((r) => r.project_id === ctx.projectId) : undefined;
  if (byProject) return { percent: byProject.percent, source: "Chính sách theo dự án" };
  return { percent: rules.default_percent, source: "Chính sách mặc định" };
}

export type CommissionPlanRow = {
  beneficiary_user_id: string | null;
  beneficiary_name: string | null;
  role_label: string;
  percent: number;
  amount: number;
};

export type CommissionPlan = {
  percent: number;
  source: string;
  pool: number;
  rows: CommissionPlanRow[];
};

const round = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;

/**
 * Tính hoa hồng theo chính sách: tổng quỹ = % trên giá trị hợp đồng,
 * rồi chia cho sale chính, trưởng nhóm, quản lý và quỹ sàn.
 * Phần của người không xác định được sẽ dồn về quỹ sàn.
 */
export function buildCommissionPlan(
  rules: CommissionRules,
  input: {
    netPrice: number;
    projectId?: string | null;
    teamId?: string | null;
    ownerUserId?: string | null;
    ownerName?: string | null;
    teamLeadUserId?: string | null;
    teamLeadName?: string | null;
    managerName?: string | null;
    overridePercent?: number | null;
  },
): CommissionPlan {
  const resolved = resolveCommissionPercent(rules, {
    projectId: input.projectId,
    teamId: input.teamId,
    userId: input.ownerUserId,
    overridePercent: input.overridePercent,
  });
  const netPrice = Math.max(0, input.netPrice || 0);
  const pool = round((netPrice * resolved.percent) / 100);
  const splits = rules.splits;
  const splitTotal = splits.sale + splits.team_lead + splits.manager + splits.company;
  const share = (value: number) => (splitTotal > 0 ? round((pool * value) / splitTotal) : 0);

  const rows: CommissionPlanRow[] = [];
  let companyAmount = share(splits.company);

  const push = (
    key: keyof CommissionRules["splits"],
    userId: string | null | undefined,
    name: string | null | undefined,
  ) => {
    const amount = share(splits[key]);
    if (amount <= 0) return;
    if (!userId && key !== "company") {
      companyAmount = round(companyAmount + amount);
      return;
    }
    rows.push({
      beneficiary_user_id: userId ?? null,
      beneficiary_name: name ?? null,
      role_label: SPLIT_LABEL[key],
      percent: splitTotal > 0 ? round((resolved.percent * splits[key]) / splitTotal) : 0,
      amount,
    });
  };

  push("sale", input.ownerUserId, input.ownerName);
  const leadId = input.teamLeadUserId && input.teamLeadUserId !== input.ownerUserId ? input.teamLeadUserId : null;
  push("team_lead", leadId, leadId ? input.teamLeadName : null);
  const managerId = rules.manager_user_id && rules.manager_user_id !== input.ownerUserId ? rules.manager_user_id : null;
  push("manager", managerId, managerId ? input.managerName : null);

  if (companyAmount > 0) {
    rows.push({
      beneficiary_user_id: null,
      beneficiary_name: "Quỹ sàn",
      role_label: SPLIT_LABEL.company,
      percent: pool > 0 ? round((resolved.percent * companyAmount) / pool) : 0,
      amount: companyAmount,
    });
  }

  return { percent: resolved.percent, source: resolved.source, pool, rows };
}
