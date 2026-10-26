import {useState} from 'react';
import {useQuery,useQueryClient} from '@tanstack/react-query';
import {useServerFn} from '@tanstack/react-start';
import {toast} from 'sonner';
import {RefreshCw,Save,Clock,PhoneCall,Check,History} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Label} from '@/components/ui/label';
import {Badge} from '@/components/ui/badge';
import {Select,SelectTrigger,SelectValue,SelectContent,SelectItem} from '@/components/ui/select';
import {getAgencyRouting,saveAgencyRouting,updateAgencyReferral} from '@/lib/agency-routing.functions';
import {agencyRoutingCopy as c,referralSla} from '@/lib/agency-routing';

export function AgencyRouting({tenantId,agencyId}:{tenantId:string;agencyId:string}){
 const load=useServerFn(getAgencyRouting),save=useServerFn(saveAgencyRouting),action=useServerFn(updateAgencyReferral),qc=useQueryClient();
 const [project,setProject]=useState(''),[sla,setSla]=useState(30),[busy,setBusy]=useState(false);
 const q=useQuery({queryKey:['agency-routing',tenantId,agencyId],queryFn:()=>load({data:{tenantId,agencyId}}),refetchInterval:30000});
 const refresh=()=>qc.invalidateQueries({queryKey:['agency-routing',tenantId,agencyId]});
 const run=async(fn:()=>Promise<unknown>)=>{setBusy(true);try{await fn();await refresh();toast.success(c.saved);}catch(e){toast.error(e instanceof Error?e.message:c.error);}finally{setBusy(false);}};
 const d=q.data;
 return <div className="space-y-4 pt-3">
  <div className="flex items-center justify-between gap-3"><h3 className="font-semibold">{c.title}</h3><Button size="icon" variant="outline" aria-label={c.refresh} title={c.refresh} onClick={()=>q.refetch()}><RefreshCw className="size-4"/></Button></div>
  {q.error&&<p className="text-sm text-destructive">{q.error.message}</p>}
  {d?.canConfigure&&<form className="flex flex-wrap items-end gap-3 border-b border-border pb-4" onSubmit={e=>{e.preventDefault();if(project)run(()=>save({data:{tenantId,agencyId,projectId:project,enabled:true,sla}}));}}><div className="w-full sm:w-64"><Label>{c.project}</Label><Select value={project} onValueChange={setProject}><SelectTrigger><SelectValue placeholder={c.chooseProject}/></SelectTrigger><SelectContent>{d.projects.map(p=><SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent></Select></div><div className="w-32"><Label htmlFor="agency-rule-sla">{c.sla}</Label><Input id="agency-rule-sla" type="number" min={5} max={1440} value={sla} onChange={e=>setSla(Number(e.target.value))}/></div><Button disabled={busy||!project} type="submit"><Save className="size-4"/>{c.save}</Button></form>}
  <ul className="divide-y divide-border">{d?.rules.map(r=><li key={r.id} className="flex flex-wrap items-center justify-between gap-2 py-2"><span className="text-sm">{r.project_name} · {r.sla_minutes} phút <Badge variant="secondary">{r.enabled?c.enabled:c.disabled}</Badge></span>{d.canConfigure&&<Button size="sm" variant="outline" disabled={busy} onClick={()=>run(()=>save({data:{tenantId,agencyId,projectId:r.project_id,enabled:!r.enabled,sla:r.sla_minutes}}))}>{r.enabled?c.disable:c.enable}</Button>}</li>)}</ul>
  {d?.referrals.length===0&&<p className="py-6 text-sm text-muted-foreground">{c.noLeads}</p>}
  <ul className="divide-y divide-border border-t border-border">{d?.referrals.map(f=>{
   const state=referralSla(f.sla_due_at,f.responded_at,f.status);return <li key={f.id} className="space-y-3 py-4">
    <div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0"><p className="break-words font-medium">{f.full_name||c.customer}</p><p className="break-words text-sm text-muted-foreground">{[f.phone,f.email].filter(Boolean).join(' · ')}</p><p className="text-xs text-muted-foreground">{f.project_name} · {f.source}</p></div><Badge variant={state==='overdue'?'destructive':'secondary'}>{c[state]}</Badge></div>
    <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground"><span>{c.sale}: {f.sale_name}</span><span className="flex items-center gap-1"><Clock className="size-3"/>{c.slaDue}: {new Date(f.sla_due_at).toLocaleString('vi-VN')}</span></div>
    {f.canUpdate&&f.status!=='closed'&&<div className="flex flex-wrap gap-2">{f.status==='assigned'&&<Button size="sm" variant="outline" disabled={busy} onClick={()=>run(()=>action({data:{id:f.id,action:'contacted'}}))}><PhoneCall className="size-4"/>{c.contacted}</Button>}<Button size="sm" variant="outline" disabled={busy} onClick={()=>run(()=>action({data:{id:f.id,action:'closed'}}))}><Check className="size-4"/>{c.closed}</Button>{d.canReassign&&f.status==='assigned'&&<Select value={f.sale_user_id} disabled={busy} onValueChange={saleId=>run(()=>action({data:{id:f.id,action:'reassign',saleId}}))}><SelectTrigger className="w-full sm:w-52" aria-label={c.reassign}><SelectValue/></SelectTrigger><SelectContent>{d.sales.map(s=><SelectItem key={s.user_id} value={s.user_id}>{s.name}</SelectItem>)}</SelectContent></Select>}</div>}
    <details className="text-xs text-muted-foreground"><summary className="flex cursor-pointer items-center gap-1"><History className="size-3"/>{c.history}</summary><ul className="mt-2 space-y-1">{f.history.map((h,i)=><li key={i}>{c[h.action as 'assigned'|'reassigned'|'contacted'|'closed']??h.action} · {new Date(h.at).toLocaleString('vi-VN')}</li>)}</ul></details>
   </li>;
  })}</ul>
 </div>;
}