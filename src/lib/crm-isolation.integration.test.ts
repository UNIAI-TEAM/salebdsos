import { describe, it, expect } from 'vitest';
const url=process.env['VITE_SUPABASE_URL'], key=process.env['VITE_SUPABASE_PUBLISHABLE_KEY'];
const session=JSON.parse(process.env['LOVABLE_BROWSER_SUPABASE_SESSION_JSON']??'{}');
const phase=process.env['CRM_SECURITY_QA'];
const enabled=Boolean(url&&key&&session.access_token&&phase==='sale');
const tenant='11111111-2222-4333-8444-555555550047',foreign='11111111-2222-4333-8444-555555550048';
const own='22222222-2222-4333-8444-555555550047',other='22222222-2222-4333-8444-555555550048';
async function req(path:string,method='GET',body?:unknown){
 const r=await fetch(`${url}/rest/v1/${path}`,{method,headers:{apikey:key??'',Authorization:`Bearer ${session.access_token}`,'Content-Type':'application/json',Prefer:'return=representation'},body:body===undefined?undefined:JSON.stringify(body)});
 return {status:r.status,data:await r.json()};
}
describe.skipIf(!enabled)('Direct CRM and CTV access isolation',()=>{
 it('Sale reads only own leads even when the owner filter is omitted',async()=>{
  const r=await req(`leads?tenant_id=eq.${tenant}&select=id`);expect(r.status).toBe(200);expect(r.data).toEqual([{id:own}]);
 });
 it('Sale cannot read or mutate another Sale lead',async()=>{
  expect((await req(`leads?id=eq.${other}&select=id`)).data).toEqual([]);
  expect((await req(`leads?id=eq.${other}`,'PATCH',{notes:'unauthorized'})).data).toEqual([]);
 });
 it('Sale cannot steal another Sale assignment',async()=>{
  const r=await req(`leads?id=eq.${own}`,'PATCH',{owner_user_id:'f2a2301c-ab4a-486e-a626-af048ffdfe4e'});expect(r.status).toBeGreaterThanOrEqual(400);
 });
 it('Sale reads own contract but cannot modify its price',async()=>{
  const r=await req(`contracts?tenant_id=eq.${tenant}&select=id`);expect(r.status).toBe(200);expect(r.data).toEqual([{id:'33333333-2222-4333-8444-555555550047'}]);
  expect((await req('contracts?id=eq.33333333-2222-4333-8444-555555550047','PATCH',{net_price:1})).data).toEqual([]);
 });
 it('CTV-only membership grants no CRM reads in the inviting tenant',async()=>{
  expect((await req(`leads?tenant_id=eq.${foreign}&select=id`)).data).toEqual([]);
  for(const table of ['sales_collaborators','collaborator_referrals','collaborator_payments','collaborator_portal_invites']){
   const r=await req(`${table}?select=id&limit=1`);expect(r.status===403||(r.status===200&&r.data.length===0)).toBe(true);
  }
 });
 it('CTV cannot invoke admin workspace or commission commands',async()=>{
  expect((await req('rpc/collaborator_workspace','POST',{p_tenant:foreign})).status).toBeGreaterThanOrEqual(400);
  expect((await req('rpc/collaborator_command','POST',{p_tenant:foreign,p_action:'pay',p_data:{}})).status).toBeGreaterThanOrEqual(400);
 });
 it('CTV own portal is accessible without general CRM access',async()=>{
  const r=await req('rpc/collaborator_portal_workspace','POST',{});expect(r.status).toBe(200);expect(r.data.profile.name).toBe('QA CTV Security');expect(r.data.referrals).toEqual([]);
 });
});
describe.skipIf(!url||!key||!session.access_token||phase!=='manager')('Manager write boundary',()=>{
 it('manager cannot edit contact notes',async()=>{
  expect((await req(`leads?id=eq.${own}`,'PATCH',{notes:'Manager must not edit'})).status).toBeGreaterThanOrEqual(400);
 });
 it('manager can reassign within the same tenant',async()=>{
  const r=await req(`leads?id=eq.${own}`,'PATCH',{owner_user_id:'f2a2301c-ab4a-486e-a626-af048ffdfe4e'});expect(r.status).toBe(200);
 });
});
describe.skipIf(!url||!key||!session.access_token||phase!=='admin')('Cross-tenant write boundary',()=>{
 it('admin cannot create an active contract linked to another tenant lead',async()=>{
  const r=await req('contracts','POST',{tenant_id:tenant,code:'QA-CROSS-REJECT',sale_price:1000,net_price:1000,status:'active',lead_id:'22222222-2222-4333-8444-555555550049'});expect(r.status).toBeGreaterThanOrEqual(400);
 });
 it('tenant admin cannot manufacture platform administrator privileges',async()=>{
  const r=await req('user_roles','POST',{tenant_id:tenant,user_id:session.user.id,role:'platform_admin'});expect(r.status).toBeGreaterThanOrEqual(400);
 });
});