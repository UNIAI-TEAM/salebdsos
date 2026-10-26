import { describe,it,expect } from 'vitest';
import { canViewAgencyInventory, allocationLive } from './agencies';
const base = {masterRoles:[],partnerMember:true,partnerRoles:[],active:true,accepted:true,directlyGranted:false,teamGranted:false};
describe('agency distribution rules',()=>{
  it('master admin can oversee allocations',()=>expect(canViewAgencyInventory({...base,masterRoles:['admin']})).toBe(true));
  it('an ordinary Sale cannot read unassigned inventory',()=>expect(canViewAgencyInventory({...base,partnerRoles:['agent']})).toBe(false));
  it('direct agency grant allows a Sale',()=>expect(canViewAgencyInventory({...base,directlyGranted:true})).toBe(true));
  it('agency team grant allows its member',()=>expect(canViewAgencyInventory({...base,teamGranted:true})).toBe(true));
  it('a grant cannot cross tenant membership',()=>expect(canViewAgencyInventory({...base,partnerMember:false,directlyGranted:true})).toBe(false));
  it('paused cooperation blocks partner access',()=>expect(canViewAgencyInventory({...base,active:false,partnerRoles:['owner']})).toBe(false));
  it('unaccepted cooperation blocks partner access',()=>expect(canViewAgencyInventory({...base,accepted:false,partnerRoles:['owner']})).toBe(false));
  it('expiry and revocation stop allocations',()=>{
    const now=new Date('2026-10-26T03:33:00Z');
    expect(allocationLive('active','2026-10-26T03:32:00Z',now)).toBe(false);
    expect(allocationLive('revoked',null,now)).toBe(false);
    expect(allocationLive('active',null,now)).toBe(true);
  });
});