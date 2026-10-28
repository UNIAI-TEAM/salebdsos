import { describe, expect, it } from "vitest";
import { assertLocalPasswordTarget } from "./staff-security.server";
const client = (data: unknown, error: unknown = null) => ({ from: () => ({ select: () => ({ eq: async () => ({ data, error }) }) }) });
describe("Staff account isolation", () => {
  it("permits reset for an ordinary member of only the administering tenant", async () => {
    await expect(assertLocalPasswordTarget(client([{ tenant_id: "a", role: "agent" }]), "a", "user")).resolves.toBeUndefined();
  });
  it("blocks reset of a global account that belongs to another tenant", async () => {
    await expect(assertLocalPasswordTarget(client([{ tenant_id: "a", role: "agent" }, { tenant_id: "b", role: "admin" }]), "a", "user")).rejects.toThrow();
  });
  it("blocks platform administrator and tenant owner password takeover", async () => {
    for (const role of ["platform_admin", "owner"]) await expect(assertLocalPasswordTarget(client([{ tenant_id: "a", role }]), "a", "user")).rejects.toThrow();
  });
  it("fails closed when membership verification fails", async () => {
    for (const sb of [client(null, { message: "failed" }), client([])]) await expect(assertLocalPasswordTarget(sb, "a", "user")).rejects.toThrow();
  });
});