// Pure: merge every touchpoint of one customer into a single sorted timeline.
export type C360Kind =
  | "lead" | "message" | "call" | "contract" | "installment"
  | "payment" | "event" | "file" | "nurture" | "appointment" | "transaction";

export type C360Event = {
  id: string;
  kind: C360Kind;
  at: string;
  title: string;
  detail?: string | null;
  amount?: number | null;
  link?: string | null;
};

export function normPhone(p?: string | null): string | null {
  if (!p) return null;
  let d = p.replace(/\D/g, "");
  if (d.startsWith("84")) d = "0" + d.slice(2);
  return d.length >= 9 ? d : null;
}

export function matchesCustomerIdentity(customer: { phone?: string | null; email?: string | null }, lead: { phone?: string | null; email?: string | null; meta?: { identity_review_required?: boolean } | null }) {
  if (lead.meta?.identity_review_required) return false;
  const phone = normPhone(customer.phone);
  return Boolean((phone && normPhone(lead.phone) === phone) || (customer.email && lead.email?.trim().toLowerCase() === customer.email.trim().toLowerCase()));
}

type Src = {
  leads?: any[]; messages?: any[]; calls?: any[]; contracts?: any[];
  installments?: any[]; payments?: any[]; tickets?: any[]; files?: any[];
  nurture?: any[]; appointments?: any[]; transactions?: any[];
};

const CH: Record<string, string> = {
  web_chat: "Chat web", zalo: "Zalo", call: "Cuộc gọi", sms: "SMS", email: "Email", note: "Ghi chú",
};

export function buildTimeline(s: Src): C360Event[] {
  const out: C360Event[] = [];
  for (const l of s.leads ?? [])
    out.push({ id: "l" + l.id, kind: "lead", at: l.created_at, title: `Gửi thông tin · ${l.source ?? "khác"}`, detail: l.notes });
  for (const m of s.messages ?? [])
    out.push({ id: "m" + m.id, kind: "message", at: m.created_at,
      title: `${CH[m.channel] ?? m.channel} · ${m.direction === "in" ? "Khách gửi" : "Đã gửi"}`, detail: m.body, link: "/inbox" });
  for (const c of s.calls ?? [])
    out.push({ id: "c" + c.id, kind: "call", at: c.started_at ?? c.created_at,
      title: `Cuộc gọi ${c.direction === "in" ? "đến" : "đi"} · ${c.status ?? ""}`.trim(),
      detail: [c.duration_seconds ? `${Math.round(c.duration_seconds / 60)} phút` : null, c.notes].filter(Boolean).join(" · ") || null,
      link: c.recording_url ?? null });
  for (const k of s.contracts ?? [])
    out.push({ id: "k" + k.id, kind: "contract", at: k.signed_at ?? k.created_at, title: `Hợp đồng ${k.code} · ${k.status}`, amount: Number(k.net_price ?? 0), link: "/contracts" });
  for (const i of s.installments ?? [])
    if (i.paid_at) out.push({ id: "i" + i.id, kind: "installment", at: i.paid_at, title: `Thu ${i.name}`, amount: Number(i.paid_amount ?? 0) });
  for (const p of s.payments ?? [])
    out.push({ id: "p" + p.id, kind: "payment", at: p.transferred_at ?? p.created_at, title: `Chuyển khoản ${p.bank_name ?? ""}`.trim(), detail: p.content, amount: Number(p.amount ?? 0) });
  for (const t of s.tickets ?? []) {
    out.push({ id: "t" + t.id, kind: "event", at: t.created_at, title: `Đăng ký sự kiện · vé ${t.code}` });
    if (t.checked_in_at) out.push({ id: "tc" + t.id, kind: "event", at: t.checked_in_at, title: `Check-in sự kiện · vé ${t.code}` });
  }
  for (const f of s.files ?? [])
    out.push({ id: "f" + f.id, kind: "file", at: f.created_at, title: `Tài liệu: ${f.name}`, link: f.id });
  for (const n of s.nurture ?? [])
    out.push({ id: "n" + n.id, kind: "nurture", at: n.sent_at ?? n.created_at, title: `Nhắc tự động · ${CH[n.channel] ?? n.channel} · ${n.status}`, detail: n.body });
  for (const a of s.appointments ?? [])
    out.push({ id: "a" + a.id, kind: "appointment", at: a.starts_at, title: `Lịch gặp: ${a.title}`, detail: a.location });
  for (const x of s.transactions ?? [])
    out.push({ id: "x" + x.id, kind: "transaction", at: x.occurred_at, title: `Giao dịch · ${x.kind}`, amount: Number(x.amount ?? 0), detail: x.note });
  return out.filter((e) => !!e.at).sort((a, b) => b.at.localeCompare(a.at));
}

export function summarize(s: Src) {
  const contractValue: number = (s.contracts ?? []).filter((c) => c.status !== "cancelled").reduce((t, c) => t + Number(c.net_price ?? 0), 0);
  const live = new Set((s.contracts ?? []).filter((c) => c.status !== "cancelled").map((c) => c.id));
  const paid: number = (s.installments ?? []).filter((i) => !i.contract_id || live.has(i.contract_id)).reduce((t, i) => t + Number(i.paid_amount ?? 0), 0);
  const msgs = s.messages ?? [];
  const lastIn: string | null = msgs.filter((m) => m.direction === "in").map((m) => m.created_at).sort().pop() ?? null;
  return {
    contractValue, paid, outstanding: Math.max(0, contractValue - paid),
    messages: msgs.length, calls: (s.calls ?? []).length,
    events: (s.tickets ?? []).length, lastInboundAt: lastIn,
  };
}
