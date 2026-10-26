import { z } from 'zod';

export const agencyProfileSchema = z.object({
  id: z.string().uuid().optional(), name: z.string().trim().min(2).max(160), code: z.string().trim().min(1).max(40),
  partnerSlug: z.string().trim().max(60).default(''), taxCode: z.string().trim().max(40).default(''),
  contactName: z.string().trim().max(120).default(''), phone: z.string().trim().max(30).default(''),
  email: z.union([z.string().email().max(254), z.literal('')]).default(''),
  address: z.string().trim().max(500).default(''), notes: z.string().trim().max(2000).default(''),
});
export type AgencyProfile = z.infer<typeof agencyProfileSchema>;
export type Agency = { id: string; code: string; name: string; status: string; tax_code: string | null; contact_name: string | null; phone: string | null; email: string | null; address: string | null; notes: string | null; partner_tenant_id: string | null; accepted_at: string | null; side: 'master' | 'partner'; master_name: string; partner_name: string | null; partner_slug: string | null; allocated_count: number };
export type Allocation = { id: string; project_id: string; product_id: string; status: string; expires_at: string | null; created_at: string; name: string; code: string | null; area: number | null; price: number; currency: string; listing_status: string; zone: string | null; project_name: string };
export type AgencyWorkspace = { canCreate: boolean; agencies: Agency[]; detail?: { canEdit: boolean; canAccept: boolean; canAllocate: boolean; canManageAccess: boolean; canViewInventory: boolean; allocations: Allocation[]; people: {user_id: string; name: string}[]; teams: {id: string; name: string}[]; access: {id: string; user_id: string | null; team_id: string | null; name: string}[] } };
export type AgencyCatalog = { projects: {id: string; name: string}[]; total: number; products: {id: string; code: string | null; name: string; area: number | null; price: number; currency: string; allocated: boolean}[] };

// Mirrors the database security boundary for focused rule tests; the database
// always validates roles and membership independently of the browser.
export function canViewAgencyInventory(input: { masterRoles: string[]; partnerMember: boolean; partnerRoles: string[]; active: boolean; accepted: boolean; directlyGranted: boolean; teamGranted: boolean }) {
  if (input.masterRoles.some(r => ['owner','admin','manager'].includes(r))) return true;
  return input.partnerMember && input.active && input.accepted && (input.partnerRoles.some(r => ['owner','admin','manager'].includes(r)) || input.directlyGranted || input.teamGranted);
}
export function allocationLive(status: string, expiresAt: string | null, now: Date) {
  return status === 'active' && (!expiresAt || new Date(expiresAt).getTime() > now.getTime());
}