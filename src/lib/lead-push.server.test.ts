import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ rpc: vi.fn(), from: vi.fn(), send: vi.fn(), configured: vi.fn(), upsert: vi.fn(), update: vi.fn(), eq: vi.fn() }));
vi.mock("@/integrations/supabase/client.server", () => ({ supabaseAdmin: { rpc: mocks.rpc, from: mocks.from } }));
vi.mock("./push.server", () => ({ pushConfigured: mocks.configured, sendPushToUser: mocks.send }));
import { runLeadPushJobs } from "./lead-push.server";
const job = { id: "job-1", user_id: "sale", tenant_id: "partner", lead_id: "master-lead", kind: "agency_assigned", attempts: 1, deadline: null };
beforeEach(() => {
 vi.resetAllMocks(); mocks.configured.mockReturnValue(true); mocks.send.mockResolvedValue({ sent: 1, failed: 0 });
 mocks.eq.mockReturnValue({ eq: mocks.eq, then: (resolve: (value: unknown) => void) => resolve({ error: null }) });
 mocks.update.mockReturnValue({ eq: mocks.eq }); mocks.upsert.mockResolvedValue({ error: null });
 mocks.from.mockReturnValue({ update: mocks.update, upsert: mocks.upsert });
});
function setup(target: unknown, kind = "agency_assigned", deadline: string | null = null) {
 mocks.rpc.mockImplementation(async (name: string) => ({ error: null, data: name === "claim_push_jobs_v2" ? [{ ...job, kind, deadline }] : name === "agency_push_target" ? target : null }));
}
describe("agency push worker", () => {
 it("sends only to partner devices with no master contact payload or duplicate assignment notification", async () => {
  setup({ user_id: "sale", tenant_id: "partner", status: "assigned", responded_at: null });
  expect(await runLeadPushJobs()).toEqual({ processed: 1, accepted: 1 });
  expect(mocks.send).toHaveBeenCalledWith(expect.objectContaining({ userId: "sale", tenantId: "partner", link: "/agencies" }));
  expect(mocks.send.mock.calls[0][0]).not.toHaveProperty("lead_id");
  expect(mocks.upsert).not.toHaveBeenCalled();
 });
 it("does not deliver stale handover or revoked grant jobs", async () => {
  setup(null); await runLeadPushJobs(); expect(mocks.send).not.toHaveBeenCalled();
  expect(mocks.update).toHaveBeenCalledWith(expect.objectContaining({ state: "skipped" }));
 });
 it("stores SLA alert in the partner tenant and sends within the warning window", async () => {
  const due = new Date(Date.now() + 4 * 60_000).toISOString();
  setup({ user_id: "sale", tenant_id: "partner", status: "assigned", responded_at: null, sla_due_at: due }, "agency_sla_warning", due);
  await runLeadPushJobs();
  expect(mocks.upsert).toHaveBeenCalledWith(expect.objectContaining({ tenant_id: "partner", user_id: "sale", type: "agency_sla_warning" }), expect.anything());
  expect(mocks.send).toHaveBeenCalledWith(expect.objectContaining({ ttl: expect.any(Number) }));
 });
 it("stops retries after three provider failures", async () => {
  setup({ user_id: "sale", tenant_id: "partner", status: "assigned", responded_at: null });
  mocks.send.mockResolvedValue({ sent: 0, failed: 1 });
  const original = mocks.rpc.getMockImplementation();
  mocks.rpc.mockImplementation(async (...args: unknown[]) => {
   if (args[0] === "claim_push_jobs_v2") return { error: null, data: [{ ...job, attempts: 3 }] };
   return original?.(...args);
  });
  await runLeadPushJobs(); expect(mocks.update).toHaveBeenCalledWith(expect.objectContaining({ state: "failed" }));
 });
});