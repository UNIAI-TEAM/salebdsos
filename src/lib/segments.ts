// Dynamic customer segments — pure rules shared by preview and campaign send.
import { z } from "zod";

export const segmentSchema = z.object({
  projectIds: z.array(z.string()).default([]),
  statuses: z.array(z.string()).default([]),
  sources: z.array(z.string()).default([]),
  createdWithinDays: z.number().int().min(1).max(3650).nullable().default(null),
  inactiveDays: z.number().int().min(1).max(3650).nullable().default(null),
  excludeWon: z.boolean().default(true),
});
export type Segment = z.infer<typeof segmentSchema>;
export const EMPTY_SEGMENT: Segment = segmentSchema.parse({});

export function parseSegment(v: unknown): Segment {
  const r = segmentSchema.safeParse((v as { segment?: unknown } | null)?.segment ?? {});
  return r.success ? r.data : EMPTY_SEGMENT;
}

export type SegmentLead = {
  status: string;
  source: string | null;
  project_id: string | null;
  created_at: string;
  updated_at: string;
  phone: string | null;
  email: string | null;
  meta?: unknown;
};

const DAY = 86_400_000;

export function isUnsubscribed(lead: SegmentLead): boolean {
  const m = (lead.meta ?? {}) as { unsubscribed?: boolean };
  return m.unsubscribed === true;
}

export function matchLead(lead: SegmentLead, seg: Segment, now = Date.now()): boolean {
  if (seg.excludeWon && (lead.status === "won" || lead.status === "lost")) return false;
  if (seg.projectIds.length && !seg.projectIds.includes(lead.project_id ?? "")) return false;
  if (seg.statuses.length && !seg.statuses.includes(lead.status)) return false;
  if (seg.sources.length && !seg.sources.includes(lead.source ?? "")) return false;
  if (seg.createdWithinDays && now - Date.parse(lead.created_at) > seg.createdWithinDays * DAY) return false;
  if (seg.inactiveDays && now - Date.parse(lead.updated_at) < seg.inactiveDays * DAY) return false;
  return true;
}

/** Can this lead be reached on the channel? zalo falls back to phone-based OA lookup. */
export function reachable(lead: SegmentLead, channel: string): boolean {
  if (isUnsubscribed(lead)) return false;
  if (channel === "email") return !!lead.email;
  if (channel === "sms" || channel === "zalo") return !!lead.phone;
  return true; // push → notifies owning sale
}

export function renderTemplate(tpl: string, vars: Record<string, string | null | undefined>): string {
  return tpl.replace(/\{(\w+)\}/g, (_, k) => (vars[k] ?? "").toString()).trim();
}
