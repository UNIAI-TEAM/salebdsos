import {it,expect} from 'vitest';
const url=process.env['VITE_SUPABASE_URL'];
const key=process.env['VITE_SUPABASE_PUBLISHABLE_KEY'];
const session=process.env['LOVABLE_BROWSER_SUPABASE_SESSION_JSON'];
const agency=process.env['AGENCY_ACCESS_TEST_ID'];
const tenant=process.env['AGENCY_ACCESS_TEST_TENANT'];
const product=process.env['AGENCY_ACCESS_TEST_PRODUCT'];
const active=Boolean(url&&key&&session&&agency&&tenant&&product);
async function read(path:string,body?:unknown){
 const token=JSON.parse(session??'{}').access_token;
 return fetch(`${url}/rest/v1/${path}`,{method:body?'POST':'GET',headers:{apikey:key??'',Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined});
}
it.skipIf(!active)('partner reads only active unexpired allocations, not revoked or expired ones',async()=>{
 const r=await read(`agency_allocations?select=product_id&agency_id=eq.${agency}`);
 expect(r.status).toBe(200);expect(await r.json()).toEqual([{product_id:product}]);
});
it.skipIf(!active)('raw history and referral identities cannot bypass masked RPCs',async()=>{
 for(const table of ['agency_referral_handovers','agency_lead_referrals','agency_access']){
  const r=await read(`${table}?select=*&limit=1`);expect(r.status).toBe(403);
 }
});
it.skipIf(!active)('ordinary Sale cannot read private agency profile or roster',async()=>{
 const r=await read('rpc/agency_workspace',{p_tenant:tenant,p_agency:agency});expect(r.status).toBe(200);
 const data=await r.json();expect(data.agencies[0].phone).toBe(null);expect(data.agencies[0].notes).toBe(null);expect(data.detail.people).toEqual([]);expect(data.detail.access).toEqual([]);
});