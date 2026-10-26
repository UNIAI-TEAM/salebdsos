import { createFileRoute } from '@tanstack/react-router';
import { useServerFn } from '@tanstack/react-start';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Building2, Plus, Pencil, Package, Users2, ShieldCheck, Trash2, ArrowLeft, ArrowRight, Search } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/use-auth';
import { PageHeader, KpiCard } from '@/components/app/ui';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { changeAgency, getAgencyWorkspace, getAgencyCatalog, type AgencyCommand } from '@/lib/agencies.functions';
import { allocationLive, type AgencyProfile } from '@/lib/agencies';
import { agencyCopy as c } from '@/lib/agencies-copy';
import { AgencyRouting } from '@/components/app/agency-routing';
import { agencyRoutingCopy } from '@/lib/agency-routing';

export const Route=createFileRoute('/_app/agencies')({
  head:()=>({meta:[{title:`${c.title} — SaleBDS OS`},{name:'description',content:c.description},{property:'og:title',content:`${c.title} — SaleBDS OS`},{property:'og:description',content:c.description},{property:'og:type',content:'website'},{name:'twitter:card',content:'summary'}]}),
  component:AgenciesPage,
});
const blank:AgencyProfile={name:'',code:'',partnerSlug:'',taxCode:'',contactName:'',phone:'',email:'',address:'',notes:''};
const money=(n:number,currency='VND')=>new Intl.NumberFormat('vi-VN',{style:'currency',currency}).format(n);
function AgenciesPage(){
  const {currentTenant}=useAuth();
  // A key remount avoids displaying the previous tenant's selection or forms.
  return currentTenant ? <AgencyScreen key={currentTenant.id} tenantId={currentTenant.id} tenantName={currentTenant.name}/> : <p className="text-muted-foreground">{c.loading}</p>;
}
function AgencyScreen({tenantId,tenantName}:{tenantId:string;tenantName:string}){
  const qc=useQueryClient(); const load=useServerFn(getAgencyWorkspace); const command=useServerFn(changeAgency); const catalogFn=useServerFn(getAgencyCatalog);
  const [active,setActive]=useState<string>(); const [search,setSearch]=useState(''); const [edit,setEdit]=useState<AgencyProfile|null>(null);
  const [tab,setTab]=useState('inventory'); const [allocating,setAllocating]=useState(false); const [project,setProject]=useState<string>();
  const [page,setPage]=useState(0); const [selected,setSelected]=useState<string[]>([]); const [expiry,setExpiry]=useState(''); const [busy,setBusy]=useState(false);
  const q=useQuery({queryKey:['agencies',tenantId,active],queryFn:()=>load({data:{tenantId,agencyId:active}})});
  const catalog=useQuery({queryKey:['agency-catalog',tenantId,project,page],queryFn:()=>catalogFn({data:{tenantId,projectId:project,page}}),enabled:allocating});
  const d=q.data; const agencies=d?.agencies??[]; const cur=agencies.find(a=>a.id===active); const detail=d?.detail;
  const refresh=()=>Promise.all([qc.invalidateQueries({queryKey:['agencies',tenantId]}),qc.invalidateQueries({queryKey:['agency-catalog',tenantId]})]);
  const run=async(input:Omit<AgencyCommand,'tenantId'>,onDone?:()=>void)=>{
    setBusy(true);try{const r=await command({data:{...input,tenantId} as AgencyCommand});await refresh();onDone?.();toast.success(input.action==='save'?c.saved:c.done);return r.id;}catch(e){toast.error(e instanceof Error?e.message:c.error);}finally{setBusy(false);}
  };
  const statusLabel=(a:typeof agencies[number])=>!a.partner_tenant_id?c.disconnected:!a.accepted_at?c.pending:a.status==='paused'?c.paused:c.active;
  const rows=agencies.filter(a=>`${a.name} ${a.code}`.toLowerCase().includes(search.toLowerCase()));
  return <div className="space-y-4">
    <PageHeader compact title={c.title} action={d?.canCreate?<Button size="sm" onClick={()=>setEdit({...blank})}><Plus className="size-4"/><span className="hidden sm:inline">{c.add}</span></Button>:undefined}/>
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      <KpiCard compact icon={Building2} label={c.summaryAgencies} value={String(agencies.length)} delta={0}/>
      <KpiCard compact icon={ShieldCheck} label={c.summaryActive} value={String(agencies.filter(a=>a.accepted_at&&a.status==='active').length)} delta={0} tone="green"/>
      <KpiCard compact icon={Package} label={c.summaryProducts} value={String(agencies.reduce((s,a)=>s+a.allocated_count,0))} delta={0} tone="blue"/>
    </div>
    {q.isLoading&&<p className="text-sm text-muted-foreground">{c.loading}</p>}
    {q.error&&<div className="flex items-center gap-3 text-sm text-destructive">{q.error.message}<Button size="sm" variant="outline" onClick={()=>q.refetch()}>{c.retry}</Button></div>}
    <div className="grid min-w-0 gap-5 xl:grid-cols-[280px_minmax(0,1fr)]">
      <aside className="min-w-0 space-y-2">
        <div className="relative"><Search className="absolute left-3 top-3 size-4 text-muted-foreground"/><Input className="pl-9" placeholder={c.search} value={search} onChange={e=>setSearch(e.target.value)}/></div>
        {d&&rows.length===0&&<p className="py-8 text-center text-sm text-muted-foreground">{c.empty}</p>}
        {rows.map(a=><Button key={a.id} variant="ghost" onClick={()=>setActive(a.id)} className={`h-auto w-full justify-start rounded-lg border p-3 text-left ${active===a.id?'border-primary bg-primary/10':'border-border'}`}>
          <Building2 className="size-5 shrink-0 text-primary"/><span className="min-w-0 flex-1"><span className="block truncate font-semibold">{a.name}</span><span className="block truncate text-xs font-normal text-muted-foreground">{a.code} · {statusLabel(a)}</span></span><Badge variant="secondary">{a.allocated_count}</Badge>
        </Button>)}
      </aside>
      {cur&&detail?<section className="min-w-0 space-y-4">
        <header className="flex flex-wrap items-start justify-between gap-3 border-b border-border pb-3">
          <div className="min-w-0"><div className="mb-1 flex flex-wrap items-center gap-2"><h2 className="break-words text-xl font-semibold">{cur.name}</h2><Badge variant="secondary">{statusLabel(cur)}</Badge></div><p className="break-words text-sm text-muted-foreground">{cur.master_name} → {cur.partner_name??cur.name}</p></div>
          <div className="flex flex-wrap gap-2">
            {detail.canAccept&&<Button disabled={busy} size="sm" onClick={()=>run({action:'accept',payload:{id:cur.id}})}><ShieldCheck className="size-4"/>{c.accept}</Button>}
            {detail.canEdit&&<Button variant="outline" size="sm" onClick={()=>setEdit({id:cur.id,name:cur.name,code:cur.code,partnerSlug:cur.partner_slug??'',taxCode:cur.tax_code??'',contactName:cur.contact_name??'',phone:cur.phone??'',email:cur.email??'',address:cur.address??'',notes:cur.notes??''})}><Pencil className="size-4"/>{c.edit}</Button>}
            {detail.canEdit&&cur.accepted_at&&<Button variant="outline" size="sm" disabled={busy} onClick={()=>run({action:'status',payload:{id:cur.id,status:cur.status==='paused'?'active':'paused'}})}>{cur.status==='paused'?c.resume:c.pause}</Button>}
          </div>
        </header>
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="grid h-auto w-full grid-cols-2 sm:grid-cols-4 sm:w-auto"><TabsTrigger value="inventory" className="whitespace-normal text-xs sm:text-sm">{c.inventory}</TabsTrigger><TabsTrigger value="routing" className="whitespace-normal text-xs sm:text-sm">{agencyRoutingCopy.title}</TabsTrigger><TabsTrigger value="profile">{c.profile}</TabsTrigger><TabsTrigger value="access">{c.access}</TabsTrigger></TabsList>
          <TabsContent value="routing"><AgencyRouting key={`${tenantId}:${cur.id}`} tenantId={tenantId} agencyId={cur.id}/></TabsContent>
          <TabsContent value="profile" className="pt-3"><dl className="grid gap-4 sm:grid-cols-2">{[[c.code,cur.code],[c.taxCode,cur.tax_code],[c.contactName,cur.contact_name],[c.phone,cur.phone],[c.email,cur.email],[c.address,cur.address],[c.partnerSlug,cur.partner_slug],[c.notes,cur.notes]].map(([label,value])=><div key={label}><dt className="text-xs text-muted-foreground">{label}</dt><dd className="mt-1 break-words text-sm">{value||'—'}</dd></div>)}</dl></TabsContent>
          <TabsContent value="inventory" className="space-y-3 pt-3">
            <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="text-sm font-semibold">{c.inventory} ({detail.allocations.length})</h3>{detail.canAllocate&&cur.accepted_at&&cur.status==='active'&&<Button size="sm" disabled={busy} onClick={()=>{setProject(undefined);setPage(0);setSelected([]);setExpiry('');setAllocating(true);}}><Plus className="size-4"/>{c.allocate}</Button>}</div>
            {!detail.canViewInventory?<p className="py-6 text-sm text-muted-foreground">{cur.accepted_at?c.limited:c.waitingAccess}</p>:detail.allocations.length===0?<p className="py-6 text-sm text-muted-foreground">{c.noProducts}</p>:<>
              <ul className="divide-y divide-border border-y border-border sm:hidden">{detail.allocations.map(a=><li key={a.id} className="space-y-2 py-3 pr-14"><div className="flex flex-wrap items-center justify-between gap-2"><span className="font-semibold">{a.code||a.name}</span><Badge variant="secondary">{a.status==='revoked'?c.revoked:allocationLive(a.status,a.expires_at,new Date())?c.live:c.expired}</Badge></div><p className="break-words text-sm text-muted-foreground">{a.project_name}{a.area?` · ${a.area} m²`:''}</p><p className="text-sm font-medium tabular-nums">{money(a.price,a.currency)}</p><p className="text-xs text-muted-foreground">{c.states[a.listing_status]??a.listing_status} · {a.expires_at?new Date(a.expires_at).toLocaleDateString('vi-VN'):c.noExpiry}</p>{detail.canAllocate&&a.status==='active'&&<Button size="sm" variant="outline" disabled={busy} onClick={()=>{if(confirm(c.confirmRevoke))run({action:'revoke',payload:{id:cur.id,allocationId:a.id}});}}><Trash2 className="size-4"/>{c.revoke}</Button>}</li>)}</ul>
              <div className="hidden overflow-x-auto border-y border-border sm:block"><table className="w-full min-w-[650px] text-sm"><thead className="bg-muted text-xs text-muted-foreground"><tr>{[c.product,c.project,c.price,c.expiryColumn,c.status,''].map((s,i)=><th key={i} className="px-3 py-2 text-left font-medium">{s}</th>)}</tr></thead><tbody>{detail.allocations.map(a=><tr key={a.id} className="border-t border-border"><td className="px-3 py-3"><div className="font-medium">{a.code||a.name}</div><div className="text-xs text-muted-foreground">{a.area?`${a.area} m²`:'—'}</div></td><td className="px-3 py-3">{a.project_name}</td><td className="whitespace-nowrap px-3 py-3 tabular-nums">{money(a.price,a.currency)}</td><td className="px-3 py-3">{a.expires_at?new Date(a.expires_at).toLocaleDateString('vi-VN'):c.noExpiry}</td><td className="px-3 py-3"><Badge variant="secondary">{a.status==='revoked'?c.revoked:allocationLive(a.status,a.expires_at,new Date())?c.live:c.expired}</Badge><div className="mt-1 text-xs text-muted-foreground">{c.states[a.listing_status]??a.listing_status}</div></td><td className="px-2 py-3">{detail.canAllocate&&a.status==='active'&&<Button size="icon" variant="ghost" aria-label={c.revoke} title={c.revoke} disabled={busy} onClick={()=>{if(confirm(c.confirmRevoke))run({action:'revoke',payload:{id:cur.id,allocationId:a.id}});}}><Trash2 className="size-4"/></Button>}</td></tr>)}</tbody></table></div>
            </>}
          </TabsContent>
          <TabsContent value="access" className="space-y-4 pt-3">
            <div className="flex items-center gap-2 text-sm"><ShieldCheck className="size-4 text-primary"/>{c.adminAccess}</div>
            {detail.canManageAccess&&<div className="flex flex-wrap gap-2"><Select value="" disabled={busy} onValueChange={uid=>run({action:'access_add',payload:{id:cur.id,userId:uid}})}><SelectTrigger className="w-full sm:w-60"><SelectValue placeholder={c.choosePerson}/></SelectTrigger><SelectContent>{detail.people.filter(p=>!detail.access.some(g=>g.user_id===p.user_id)).map(p=><SelectItem key={p.user_id} value={p.user_id}>{p.name}</SelectItem>)}</SelectContent></Select><Select value="" disabled={busy} onValueChange={tid=>run({action:'access_add',payload:{id:cur.id,teamId:tid}})}><SelectTrigger className="w-full sm:w-60"><SelectValue placeholder={c.chooseTeam}/></SelectTrigger><SelectContent>{detail.teams.filter(t=>!detail.access.some(g=>g.team_id===t.id)).map(t=><SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent></Select></div>}
            {detail.canManageAccess&&detail.access.length===0&&<p className="text-sm text-muted-foreground">{c.noAccess}</p>}
            <ul className="divide-y divide-border">{detail.access.map(g=><li key={g.id} className="flex items-center justify-between gap-3 py-3"><span className="min-w-0 break-words text-sm">{g.name} <Badge variant="secondary">{g.team_id?c.group:c.sale}</Badge></span>{detail.canManageAccess&&<Button size="icon" variant="ghost" disabled={busy} aria-label={c.remove} title={c.remove} onClick={()=>run({action:'access_remove',payload:{id:cur.id,accessId:g.id}})}><Trash2 className="size-4"/></Button>}</li>)}</ul>
          </TabsContent>
        </Tabs>
      </section>:<div className="hidden items-center justify-center py-20 text-muted-foreground xl:flex"><Building2 className="size-12"/></div>}
    </div>
    <Dialog open={edit!==null} onOpenChange={open=>{if(!open)setEdit(null);}}><DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-xl"><DialogHeader><DialogTitle>{edit?.id?c.edit:c.add}</DialogTitle></DialogHeader><form onSubmit={async e=>{e.preventDefault();if(!edit)return;const id=await run({action:'save',payload:edit},()=>setEdit(null));if(id)setActive(id);}} className="space-y-4"><div className="grid gap-3 sm:grid-cols-2">{(['name','code','partnerSlug','taxCode','contactName','phone','email','address'] as const).map(key=><div key={key} className={key==='address'?'sm:col-span-2':''}><Label htmlFor={`agency-${key}`}>{c[key]}</Label><Input id={`agency-${key}`} required={key==='name'||key==='code'} type={key==='email'?'email':'text'} disabled={key==='partnerSlug'&&Boolean(cur?.accepted_at)&&Boolean(edit?.id)} value={edit?.[key]??''} onChange={e=>setEdit(v=>v?{...v,[key]:e.target.value}:v)}/></div>)}</div><div><Label htmlFor="agency-notes">{c.notes}</Label><Textarea id="agency-notes" value={edit?.notes??''} onChange={e=>setEdit(v=>v?{...v,notes:e.target.value}:v)}/></div><DialogFooter><Button type="button" variant="outline" onClick={()=>setEdit(null)}>{c.cancel}</Button><Button type="submit" disabled={busy}>{c.save}</Button></DialogFooter></form></DialogContent></Dialog>
    <Dialog open={allocating} onOpenChange={setAllocating}><DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl"><DialogHeader><DialogTitle>{c.allocate} · {cur?.name??tenantName}</DialogTitle></DialogHeader><div className="grid gap-3 sm:grid-cols-2"><div><Label>{c.project}</Label><Select value={project??''} onValueChange={id=>{setProject(id);setPage(0);setSelected([]);}}><SelectTrigger><SelectValue placeholder={c.chooseProject}/></SelectTrigger><SelectContent>{catalog.data?.projects.map(p=><SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent></Select></div><div><Label htmlFor="allocation-expiry">{c.expiry}</Label><Input id="allocation-expiry" type="datetime-local" value={expiry} onChange={e=>setExpiry(e.target.value)}/></div></div>
      {catalog.error&&<p className="text-sm text-destructive">{catalog.error.message}</p>}
      {catalog.isFetching?<p className="text-sm text-muted-foreground">{c.loading}</p>:project&&<><div className="max-h-72 overflow-y-auto divide-y divide-border border-y border-border">{catalog.data?.products.length===0&&<p className="py-6 text-center text-sm text-muted-foreground">{c.noProducts}</p>}{catalog.data?.products.map(p=><Label key={p.id} className={`flex cursor-pointer items-center gap-3 py-3 ${p.allocated?'opacity-50':''}`}><Checkbox aria-label={p.code||p.name} disabled={p.allocated||busy} checked={selected.includes(p.id)} onCheckedChange={checked=>setSelected(s=>checked?[...s,p.id]:s.filter(id=>id!==p.id))}/><span className="min-w-0 flex-1"><span className="block truncate">{p.code||p.name}</span><span className="text-xs text-muted-foreground">{money(p.price,p.currency)}</span></span><Badge variant="secondary">{p.allocated?c.allocated:c.available}</Badge></Label>)}</div><div className="flex items-center justify-between"><Button size="icon" variant="outline" disabled={page===0} aria-label={c.previous} onClick={()=>{setPage(p=>p-1);setSelected([]);}}><ArrowLeft className="size-4"/></Button><span className="text-sm tabular-nums">{page+1} / {Math.max(1,Math.ceil((catalog.data?.total??0)/100))}</span><Button size="icon" variant="outline" disabled={(page+1)*100>=(catalog.data?.total??0)} aria-label={c.next} onClick={()=>{setPage(p=>p+1);setSelected([]);}}><ArrowRight className="size-4"/></Button></div></>}
      <DialogFooter><Button variant="outline" onClick={()=>setAllocating(false)}>{c.cancel}</Button><Button disabled={busy||selected.length===0||!project} onClick={()=>{if(!cur||!project)return;run({action:'allocate',payload:{id:cur.id,projectId:project,productIds:selected,expiresAt:expiry?new Date(expiry).toISOString():null}},()=>setAllocating(false));}}>{c.allocate} ({selected.length})</Button></DialogFooter>
    </DialogContent></Dialog>
  </div>;
}